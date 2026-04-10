import requests

def get_weather_risk(latitude: float, longitude: float, disease_key: str) -> dict:
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={latitude}&longitude={longitude}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation"
            f"&forecast_days=1"
        )
        response = requests.get(url, timeout=10)
        data = response.json()

        current = data.get("current", {})
        temperature = current.get("temperature_2m", 25)
        humidity = current.get("relative_humidity_2m", 60)
        precipitation = current.get("precipitation", 0)

        risk_level = calculate_risk(disease_key, temperature, humidity)

        return {
            "temperature": temperature,
            "humidity": humidity,
            "precipitation": precipitation,
            "risk_level": risk_level,
            "message": get_risk_message(risk_level),
        }

    except Exception as e:
        return {
            "temperature": None,
            "humidity": None,
            "precipitation": None,
            "risk_level": "unknown",
            "message": "Weather data unavailable.",
            "error": str(e),
        }


def calculate_risk(disease_key: str, temperature: float, humidity: float) -> str:
    import json, os
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "disease_info.json")

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            disease_info = json.load(f)

        if disease_key not in disease_info:
            return "low"

        thresholds = disease_info[disease_key].get("weather_risk", {})
        if not thresholds:
            return "low"

        humidity_threshold = thresholds.get("humidity_above", 100)
        temp_min = thresholds.get("temp_min", 0)
        temp_max = thresholds.get("temp_max", 50)

        humidity_risky = humidity >= humidity_threshold
        temp_risky = temp_min <= temperature <= temp_max

        if humidity_risky and temp_risky:
            return "high"
        elif humidity_risky or temp_risky:
            return "medium"
        else:
            return "low"

    except Exception:
        return "low"


def get_risk_message(risk_level: str) -> str:
    messages = {
        "high": "Current weather conditions are highly favorable for disease spread. Take immediate action.",
        "medium": "Weather conditions may support disease development. Monitor your crops closely.",
        "low": "Current weather conditions are relatively safe. Continue regular monitoring.",
        "unknown": "Unable to assess weather risk at this time.",
    }
    return messages.get(risk_level, "Monitor your crops regularly.")