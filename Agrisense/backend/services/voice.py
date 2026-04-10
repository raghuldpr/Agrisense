"""
voice.py - AgriSense Voice AI
Generates spoken diagnosis using gTTS in English, Hindi, and Tamil
"""
import os
import uuid
from gtts import gTTS

OUTPUT_DIR = "temp_uploads"
os.makedirs(OUTPUT_DIR, exist_ok=True)

LANG_CODE = {
    "en": "en",
    "hi": "hi",
    "ta": "ta",
}

def build_script(recommendation: dict, weather: dict, language: str) -> str:
    disease   = recommendation.get("disease_name", "Unknown")
    crop      = recommendation.get("crop", "")
    symptoms  = recommendation.get("symptoms", "")
    treatment = recommendation.get("treatment", [])
    prevention= recommendation.get("prevention", [])
    risk      = recommendation.get("risk_level", "").upper()
    w_temp    = weather.get("temperature", "")
    w_humid   = weather.get("humidity", "")
    w_risk    = weather.get("risk_level", "low")

    treatment_text  = ". ".join(treatment)
    prevention_text = ". ".join(prevention)

    if language == "en":
        return f"""
AgriSense diagnosis complete.

Crop: {crop}.
Disease detected: {disease}.
Risk level: {risk}.

Symptoms: {symptoms}.

Current weather: Temperature {w_temp} degrees Celsius. Humidity {w_humid} percent.
Weather disease risk: {w_risk}.

Recommended treatment: {treatment_text}.

Prevention tips: {prevention_text}.

Thank you for using AgriSense. Stay vigilant and protect your crops.
""".strip()

    elif language == "hi":
        return f"""
AgriSense निदान पूर्ण हुआ।

फसल: {crop}।
पहचाना गया रोग: {disease}।
जोखिम स्तर: {risk}।

लक्षण: {symptoms}।

वर्तमान मौसम: तापमान {w_temp} डिग्री सेल्सियस। आर्द्रता {w_humid} प्रतिशत।
मौसम रोग जोखिम: {w_risk}।

अनुशंसित उपचार: {treatment_text}।

रोकथाम के उपाय: {prevention_text}।

AgriSense का उपयोग करने के लिए धन्यवाद। सतर्क रहें और अपनी फसल की रक्षा करें।
""".strip()

    elif language == "ta":
        return f"""
AgriSense நோய் கண்டறிதல் முடிந்தது.

பயிர்: {crop}.
கண்டறியப்பட்ட நோய்: {disease}.
அபாய நிலை: {risk}.

அறிகுறிகள்: {symptoms}.

தற்போதைய வானிலை: வெப்பநிலை {w_temp} டிகிரி செல்சியஸ். ஈரப்பதம் {w_humid} சதவீதம்.
வானிலை நோய் அபாயம்: {w_risk}.

பரிந்துரைக்கப்பட்ட சிகிச்சை: {treatment_text}.

தடுப்பு முறைகள்: {prevention_text}.

AgriSense பயன்படுத்தியதற்கு நன்றி. விழிப்புடன் இருங்கள், உங்கள் பயிரை பாதுகாக்கவும்.
""".strip()

    else:
        return f"Disease detected: {disease}. Crop: {crop}. Risk: {risk}. Treatment: {treatment_text}."


def generate_voice(recommendation: dict, disease_key: str, language: str, weather: dict = None) -> str:
    """
    Generate voice audio for the full diagnosis.
    Returns path to the .mp3 file.
    """
    if weather is None:
        weather = {}

    lang      = language if language in LANG_CODE else "en"
    lang_code = LANG_CODE[lang]
    script    = build_script(recommendation, weather, lang)

    print(f"[TTS] lang={lang!r}  lang_code={lang_code!r}  script_len={len(script)}")
    print(f"[TTS] First 80 chars: {script[:80]!r}")

    filename = f"voice_{uuid.uuid4()}.mp3"
    filepath = os.path.join(OUTPUT_DIR, filename)

    tts = gTTS(text=script, lang=lang_code, slow=False)
    tts.save(filepath)

    print(f"[TTS] Saved → {filepath}")
    return filepath


def verify_tts():
    """
    Standalone test — run this file directly to verify all 3 TTS languages.
    python services/voice.py
    """
    sample_rec = {
        "disease_name": "Early Blight",
        "crop":         "Tomato",
        "symptoms":     "Dark spots on leaves",
        "treatment":    ["Apply fungicide"],
        "prevention":   ["Rotate crops"],
        "risk_level":   "medium",
    }
    sample_weather = {"temperature": "28", "humidity": "75", "risk_level": "medium"}

    print("=" * 60)
    print("AgriSense TTS Language Verification")
    print("=" * 60)
    for lang in ["en", "hi", "ta"]:
        print(f"\n--- Testing language: {lang} ---")
        try:
            path = generate_voice(sample_rec, "Tomato_Early_Blight", lang, sample_weather)
            size = os.path.getsize(path)
            print(f"✅ {lang}: Generated {size/1024:.1f} KB → {path}")
        except Exception as e:
            print(f"❌ {lang}: FAILED — {e}")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    verify_tts()