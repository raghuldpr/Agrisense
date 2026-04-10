from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
import shutil
import uuid
from dotenv import load_dotenv

load_dotenv()

from models.classifier import classify_disease
from models.segmenter import segment_leaf
from models.recommend import get_recommendation
from services.weather import get_weather_risk
from services.voice import generate_voice
from services.gemini_service import analyze_with_gemini

app = FastAPI(title="AgriSense API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Below this threshold, Groq LLaVA is called for a second opinion
ML_CONFIDENCE_THRESHOLD = 0.95

# ── Confidence boosting ───────────────────────────────────────────────────────
# Each factor adds a small boost when conditions are met.
# Final confidence is capped at 99.5%.

BOOST_ML_GROQ_AGREE   = 0.07   # ML and Groq agree on the same disease
BOOST_WEATHER_MATCH   = 0.05   # Weather conditions match disease's spread profile
BOOST_SEASON_MATCH    = 0.03   # Current season matches disease prevalence window

# Diseases that thrive in high humidity + warm temps (fungal/bacterial)
HIGH_HUMIDITY_DISEASES = {
    "Tomato_Early_Blight", "Tomato_Late_Blight", "Tomato_Leaf_Mold",
    "Tomato_Septoria_Leaf_Spot", "Tomato_Target_Spot",
    "Potato_Early_Blight", "Potato_Late_Blight",
    "Rice_Blast", "Rice_Bacterial_Blight", "Rice_Brown_Spot", "Rice_Leaf_Blast",
    "Wheat_Brown_Rust", "Wheat_Yellow_Rust",
    "Corn_Gray_Leaf_Spot", "Corn_Northern_Blight",
    "Sugarcane_Red_Rot", "Sugarcane_Bacterial_Blight",
}

# Diseases more common in Kharif (monsoon: Jun–Nov) season
KHARIF_DISEASES = {
    "Rice_Blast", "Rice_Bacterial_Blight", "Rice_Brown_Spot",
    "Rice_False_Smut", "Tomato_Late_Blight", "Tomato_Early_Blight",
    "Sugarcane_Red_Rot",
}

# Diseases more common in Rabi (winter/spring: Dec–May) season
RABI_DISEASES = {
    "Wheat_Brown_Rust", "Wheat_Yellow_Rust",
    "Potato_Early_Blight", "Potato_Late_Blight",
}


def _get_current_season() -> str:
    from datetime import datetime
    month = datetime.now().month
    return "kharif" if 6 <= month <= 11 else "rabi"


def _normalize_disease_key(disease_key: str, crop: str) -> str:
    """Normalize Groq disease name to a disease_key format."""
    return f"{crop.capitalize()}_{disease_key.replace(' ', '_')}"


def apply_confidence_boost(
    disease_key: str,
    ml_confidence: float,
    groq_disease_key: str | None,
    weather: dict,
) -> tuple:
    """
    Apply contextual boosts to the ML confidence score.

    Returns:
        (boosted_confidence: float, boost_log: list[str])
    """
    boosted    = ml_confidence
    boost_log  = []

    # Boost 1: ML and Groq agree on the same disease
    if groq_disease_key and groq_disease_key == disease_key:
        boosted   += BOOST_ML_GROQ_AGREE
        boost_log.append(f"+{BOOST_ML_GROQ_AGREE*100:.0f}% ML & Groq agree")

    # Boost 2: Weather conditions match disease spread profile
    if weather:
        humidity = weather.get("humidity", 0)
        temp     = weather.get("temperature", 0)
        if disease_key in HIGH_HUMIDITY_DISEASES and humidity > 70 and temp > 22:
            boosted   += BOOST_WEATHER_MATCH
            boost_log.append(f"+{BOOST_WEATHER_MATCH*100:.0f}% weather matches disease")

    # Boost 3: Season matches disease prevalence window
    season = _get_current_season()
    if season == "kharif" and disease_key in KHARIF_DISEASES:
        boosted   += BOOST_SEASON_MATCH
        boost_log.append(f"+{BOOST_SEASON_MATCH*100:.0f}% Kharif season match")
    elif season == "rabi" and disease_key in RABI_DISEASES:
        boosted   += BOOST_SEASON_MATCH
        boost_log.append(f"+{BOOST_SEASON_MATCH*100:.0f}% Rabi season match")

    # Cap at 99.5%
    boosted = min(boosted, 0.995)

    if boost_log:
        print(f"[BOOST] {ml_confidence:.2%} → {boosted:.2%}  ({', '.join(boost_log)})")
    else:
        print(f"[BOOST] No boosts applied. Confidence stays at {boosted:.2%}")

    return boosted, boost_log


@app.get("/")
def root():
    return {"message": "AgriSense API is running", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    crop: str = Form(...),
    language: str = Form(default="en"),
    latitude: float = Form(default=13.0827),
    longitude: float = Form(default=80.2707),
):
    file_ext      = file.filename.split(".")[-1]
    temp_filename = f"{uuid.uuid4()}.{file_ext}"
    temp_path     = os.path.join(UPLOAD_DIR, temp_filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # ── Step 1: ML classification (now returns top-3) ─────────────────────
        disease_key, ml_confidence, ml_top3 = classify_disease(temp_path, crop)
        print(f"[PREDICT] ML → {disease_key!r}  conf={ml_confidence:.4f}")
        print(f"[PREDICT] ML top-3: {ml_top3}")

        prediction_source = "ml_model"
        groq_result       = None
        groq_disease_key  = None
        groq_reasoning    = ""

        # ── Step 2: Weather fetch (early — needed for Groq context + boosting) ─
        weather = get_weather_risk(latitude, longitude, disease_key)

        # ── Step 3: Groq LLaVA fallback if ML confidence is low ──────────────
        if ml_confidence < ML_CONFIDENCE_THRESHOLD:
            print(f"[PREDICT] Low ML confidence ({ml_confidence:.2%}), calling Groq...")

            # Pass top-3 and weather into the enhanced Groq prompt
            groq_result = analyze_with_gemini(
                image_path = temp_path,
                crop       = crop,
                ml_top3    = ml_top3,
                weather    = weather,
            )

            if groq_result:
                groq_disease_key = _normalize_disease_key(
                    groq_result["disease_name"], crop
                )
                groq_conf     = groq_result["confidence"] / 100.0
                groq_reasoning = groq_result.get("reasoning", "")

                print(f"[PREDICT] Groq → {groq_disease_key} ({groq_conf:.2%})")

                if groq_conf > ml_confidence:
                    disease_key       = groq_disease_key
                    ml_confidence     = groq_conf
                    prediction_source = "groq_llava"
                    print(f"[PREDICT] ✅ Using Groq result: {disease_key} ({groq_conf:.2%})")
                else:
                    print(f"[PREDICT] ML confidence still higher, keeping ML result")
            else:
                print(f"[PREDICT] Groq failed, keeping ML result")

        # ── Step 4: Confidence boosting ───────────────────────────────────────
        boosted_confidence, boost_log = apply_confidence_boost(
            disease_key      = disease_key,
            ml_confidence    = ml_confidence,
            groq_disease_key = groq_disease_key,
            weather          = weather,
        )

        print(f"[PREDICT] Final → {disease_key} ({boosted_confidence:.2%}) via {prediction_source}")

        # ── Step 5: Segment infected region ──────────────────────────────────
        segmented_path = segment_leaf(temp_path, disease_key)

        # ── Step 6: Recommendation for requested language ─────────────────────
        recommendation = get_recommendation(disease_key, language)

        # ── Step 7: Generate voice for all 3 languages ────────────────────────
        SUPPORTED_LANGS = ["en", "hi", "ta"]
        voice_files     = {}

        for lang in SUPPORTED_LANGS:
            rec_lang = get_recommendation(disease_key, lang)
            try:
                vpath = generate_voice(rec_lang, disease_key, lang, weather)
                if vpath:
                    voice_files[lang] = f"/audio/{os.path.basename(vpath)}"
                    print(f"[VOICE] Generated {lang}: {vpath}")
            except Exception as voice_err:
                print(f"[VOICE] Warning — TTS failed for {lang}: {voice_err}")

        # ── Step 8: Return enriched response ─────────────────────────────────
        return JSONResponse({
            "success":            True,
            "disease_key":        disease_key,
            "disease_name":       recommendation["disease_name"],
            "crop":               recommendation["crop"],
            "confidence":         round(boosted_confidence * 100, 2),
            "raw_ml_confidence":  round(ml_confidence * 100, 2),
            "confidence_boosts":  boost_log,
            "risk_level":         recommendation["risk_level"],
            "symptoms":           recommendation["symptoms"],
            "treatment":          recommendation["treatment"],
            "prevention":         recommendation["prevention"],
            "weather":            weather,
            "segmented_image":    f"/image/{os.path.basename(segmented_path)}",
            "voice_file":         voice_files.get(language, voice_files.get("en")),
            "voice_files":        voice_files,
            "prediction_source":  prediction_source,
            "groq_reasoning":     groq_reasoning,
            "ml_top3":            ml_top3,
        })

    except Exception as e:
        import traceback
        print(f"[PREDICT] ERROR: {e}")
        traceback.print_exc()
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/image/{filename}")
def get_image(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path)
    return JSONResponse({"error": "Image not found"}, status_code=404)


@app.get("/audio/{filename}")
def get_audio(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="audio/mpeg")
    return JSONResponse({"error": "Audio not found"}, status_code=404)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
