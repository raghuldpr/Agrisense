from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
import time
import shutil
import uuid
import concurrent.futures
from dotenv import load_dotenv
import os
from pathlib import Path

env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

from models.classifier import classify_disease
from models.segmenter import segment_leaf
from models.recommend import get_recommendation
from services.shops import get_nearby_shops_response
from services.weather import build_forecast_response, get_weather_risk
from services.voice import generate_voice
from services.gemini_service import analyze_with_gemini, chat_with_farmer
from services.soil import process_soil_data, get_latest_soil_data, get_soil_advice, get_mock_telemetry

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    message: str = Field(..., min_length=1, max_length=1000)
    crop: str = Field(..., min_length=1, max_length=50)
    preferred_language: str = Field(..., max_length=20, pattern="^[a-zA-Z]{2,10}$")
    disease: Optional[str] = Field(None, max_length=100)
    weather_context: Optional[dict] = Field(None)
    location: Optional[str] = Field(None, max_length=100)

class SoilDataRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    device_id: str = Field(..., min_length=1, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    crop: str = Field(..., max_length=50)
    moisture: float = Field(..., ge=0.0, le=100.0)
    tds: float = Field(..., ge=0.0, le=10000.0)
    temperature: float = Field(..., ge=-50.0, le=100.0)
    humidity: float = Field(..., ge=0.0, le=100.0)
    timestamp: Optional[str] = Field(None, max_length=50)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AgriSense API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/tmp/temp_uploads"
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
@limiter.limit("60/minute")
def root(request: Request):
    return {"message": "AgriSense API is running", "version": "2.0.0"}


@app.get("/health")
@limiter.limit("60/minute")
def health(request: Request):
    return {"status": "ok"}


@app.get("/forecast")
@limiter.limit("20/minute")
def forecast(
    request: Request,
    crop: str,
    latitude: float = 13.0827,
    longitude: float = 80.2707,
):
    return JSONResponse(build_forecast_response(crop, latitude, longitude))


@app.get("/nearby-shops")
@limiter.limit("20/minute")
def nearby_shops(
    request: Request,
    lat: float = 11.0168,
    lng: float = 76.9558,
):
    try:
        return JSONResponse(get_nearby_shops_response(lat, lng))
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/chat")
@limiter.limit("20/minute")
def chat_endpoint(request: Request, payload: ChatRequest):
    response_data = chat_with_farmer(
        message=payload.message,
        crop=payload.crop,
        preferred_language=payload.preferred_language,
        disease=payload.disease,
        weather_context=payload.weather_context,
        location=payload.location,
    )
    return JSONResponse(response_data)


@app.post("/soil-data")
@limiter.limit("30/minute")
def post_soil_data(request: Request, payload: SoilDataRequest):
    try:
        data = process_soil_data(
            device_id=payload.device_id,
            crop=payload.crop,
            moisture=payload.moisture,
            tds=payload.tds,
            temperature=payload.temperature,
            humidity=payload.humidity,
            timestamp=payload.timestamp
        )
        return JSONResponse({"success": True, "data": data})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.get("/soil-latest")
@limiter.limit("30/minute")
def soil_latest(request: Request, device_id: str, simulate: bool = False):
    if simulate:
        return JSONResponse(get_mock_telemetry(device_id))
        
    data = get_latest_soil_data(device_id)
    if not data:
        return JSONResponse({"error": "No data found for this device_id"}, status_code=404)
    return JSONResponse(data)


@app.get("/soil-advice")
@limiter.limit("30/minute")
def soil_advice(request: Request, device_id: str, crop: str = "unknown", simulate: bool = False):
    if simulate:
        # Generate fake base data, then inject into SOIL_DB without overriding real data safely?
        # A simpler way is to just generate mock advice organically, but since get_soil_advice specifically
        # pulls from SOIL_DB, we can temporarily inject a pseudo device if simulated.
        pseudo_id = f"mock_{device_id}"
        mock_data = get_mock_telemetry(pseudo_id, crop)
        from services.soil import process_soil_data
        process_soil_data(**{k: v for k, v in mock_data.items() if k not in ['last_updated', 'is_simulated', 'nutrient_status']})
        advice = get_soil_advice(pseudo_id, crop)
        advice["is_simulated"] = True
        return JSONResponse(advice)

    advice = get_soil_advice(device_id, crop)
    return JSONResponse(advice)


def cleanup_temp_files(directory: str, max_age_minutes: int = 30):
    """Safely cleans up files older than max_age_minutes in the given directory."""
    try:
        now = time.time()
        count = 0
        for filename in os.listdir(directory):
            filepath = os.path.join(directory, filename)
            # Only delete files, safeguard against accidentally deleting directories
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)
                if file_age > (max_age_minutes * 60):
                    try:
                        os.remove(filepath)
                        count += 1
                    except Exception as err:
                        print(f"[CLEANUP] Warning - failed to delete {filename}: {err}")
        if count > 0:
            print(f"[CLEANUP] Safely removed {count} old temp files.")
    except Exception as e:
        print(f"[CLEANUP] Error during cleanup routine: {e}")


@app.post("/predict")
@limiter.limit("10/minute")
async def predict(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    crop: str = Form(..., max_length=50),
    language: str = Form(default="en", max_length=20, pattern="^[a-zA-Z]{2,10}$"),
    latitude: float = Form(default=13.0827, ge=-90.0, le=90.0),
    longitude: float = Form(default=80.2707, ge=-180.0, le=180.0),
):
    # Queue up a background task to clean old files without blocking this request
    background_tasks.add_task(cleanup_temp_files, UPLOAD_DIR, 30)

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

        def _generate_lang_voice(lang_code):
            try:
                rec_lang = get_recommendation(disease_key, lang_code)
                vpath = generate_voice(rec_lang, disease_key, lang_code, weather)
                if vpath:
                    print(f"[VOICE] Generated {lang_code}: {vpath}")
                    return lang_code, f"/audio/{os.path.basename(vpath)}"
            except Exception as voice_err:
                print(f"[VOICE] Warning — TTS failed for {lang_code}: {voice_err}")
            return lang_code, None

        # Execute TTS requests in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(_generate_lang_voice, l) for l in SUPPORTED_LANGS]
            for future in concurrent.futures.as_completed(futures):
                l_code, url = future.result()
                if url:
                    voice_files[l_code] = url

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
