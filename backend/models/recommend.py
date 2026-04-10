import json
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "disease_info.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    DISEASE_INFO = json.load(f)


def get_recommendation(disease_key: str, language: str = "en") -> dict:
    lang = language if language in ["en", "hi", "ta"] else "en"

    if disease_key not in DISEASE_INFO:
        return {
            "disease_name": disease_key,
            "crop": "Unknown",
            "risk_level": "unknown",
            "symptoms": "No information available.",
            "treatment": ["Consult a local agricultural expert."],
            "prevention": ["Monitor crops regularly."],
        }

    info = DISEASE_INFO[disease_key]

    return {
        "disease_name": info["disease"][lang],
        "crop": info["crop"][lang],
        "risk_level": info["risk_level"],
        "symptoms": info["symptoms"][lang],
        "treatment": info["treatment"][lang],
        "prevention": info["prevention"][lang],
        "weather_risk_thresholds": info.get("weather_risk", {}),
    }