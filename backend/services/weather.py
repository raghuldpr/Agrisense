from datetime import datetime
import json
import os

import requests


DEFAULT_LOCATION = "Coimbatore, Tamil Nadu"

CROP_FORECAST_RULES = {
    "tomato":    {"humidity_medium": 68, "humidity_high": 80, "temp_min": 22, "temp_max": 32},
    "potato":    {"humidity_medium": 70, "humidity_high": 82, "temp_min": 18, "temp_max": 28},
    "pepper":    {"humidity_medium": 67, "humidity_high": 78, "temp_min": 21, "temp_max": 31},
    "rice":      {"humidity_medium": 72, "humidity_high": 85, "temp_min": 24, "temp_max": 34},
    "corn":      {"humidity_medium": 65, "humidity_high": 78, "temp_min": 20, "temp_max": 32},
    "wheat":     {"humidity_medium": 60, "humidity_high": 72, "temp_min": 16, "temp_max": 27},
    "sugarcane": {"humidity_medium": 70, "humidity_high": 84, "temp_min": 24, "temp_max": 35},
    "default":   {"humidity_medium": 68, "humidity_high": 80, "temp_min": 20, "temp_max": 32},
}


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


def _get_crop_rule(crop: str) -> dict:
    return CROP_FORECAST_RULES.get((crop or "").lower(), CROP_FORECAST_RULES["default"])


def _safe_weekday(date_str: str, fallback_index: int) -> str:
    try:
        return datetime.fromisoformat(date_str).strftime("%a")
    except Exception:
        fallback_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return fallback_days[fallback_index % len(fallback_days)]


def calculate_forecast_risk(crop: str, temperature: float, humidity: float) -> dict:
    rules = _get_crop_rule(crop)

    humidity_score = 0
    if humidity >= rules["humidity_high"]:
        humidity_score = 55
    elif humidity >= rules["humidity_medium"]:
        humidity_score = 35
    else:
        humidity_score = 12

    temp_in_hot_zone = rules["temp_min"] <= temperature <= rules["temp_max"]
    temp_near_zone = (rules["temp_min"] - 2) <= temperature <= (rules["temp_max"] + 2)

    temp_score = 30 if temp_in_hot_zone else 15 if temp_near_zone else 6
    score = max(0, min(100, humidity_score + temp_score))

    if humidity >= rules["humidity_high"] and temp_in_hot_zone:
        risk = "high"
        reason = "Humidity is very high and temperature is favorable for disease spread."
    elif humidity >= rules["humidity_medium"] or temp_in_hot_zone:
        risk = "medium"
        reason = "Humidity or temperature is moderately favorable for disease development."
    else:
        risk = "low"
        reason = "Humidity is moderate and temperature is not highly favorable."

    return {"risk": risk, "score": score, "reason": reason}


def fetch_7_day_forecast(latitude: float, longitude: float) -> dict:
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}&longitude={longitude}"
        f"&daily=temperature_2m_max,relative_humidity_2m_mean"
        f"&timezone=auto"
        f"&forecast_days=7"
    )
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def _fallback_forecast_days(crop: str) -> list:
    fallback = [
        ("Mon", "2026-04-07", 31, 66),
        ("Tue", "2026-04-08", 32, 70),
        ("Wed", "2026-04-09", 30, 74),
        ("Thu", "2026-04-10", 29, 78),
        ("Fri", "2026-04-11", 31, 86),
        ("Sat", "2026-04-12", 33, 88),
        ("Sun", "2026-04-13", 30, 68),
    ]
    days = []
    for day, date_str, temperature, humidity in fallback:
        risk_meta = calculate_forecast_risk(crop, temperature, humidity)
        days.append({
            "day": day,
            "date": date_str,
            "temperature": temperature,
            "humidity": humidity,
            **risk_meta,
        })
    return days


def get_forecast_advice(crop: str, days: list) -> list:
    crop_name = (crop or "crop").capitalize()
    has_high = any(day["risk"] == "high" for day in days)
    has_medium = any(day["risk"] == "medium" for day in days)

    advice = [
        f"Inspect {crop_name} leaves early in the morning.",
        "Keep airflow open between plants and avoid water staying on leaves overnight.",
    ]

    if has_high:
        advice.append("Keep preventive spray planning ready for high-risk days.")
    elif has_medium:
        advice.append("Monitor fields closely and be ready to act if leaf spots increase.")
    else:
        advice.append("Continue regular monitoring while maintaining balanced irrigation.")

    return advice


def get_forecast_summary(days: list) -> tuple:
    high_risk_days = [day["day"] for day in days if day["risk"] == "high"]
    medium_days = [day["day"] for day in days if day["risk"] == "medium"]

    if high_risk_days:
        return (
            "Humidity spikes are creating a higher fungal spread window.",
            high_risk_days,
        )
    if medium_days:
        return (
            "Several days show moderate disease pressure, so close monitoring is recommended.",
            [],
        )
    return (
        "Weather conditions look relatively stable for the coming week.",
        [],
    )


def build_forecast_response(crop: str, latitude: float, longitude: float) -> dict:
    try:
        data = fetch_7_day_forecast(latitude, longitude)
        daily = data.get("daily", {})
        dates = daily.get("time", [])[:7]
        temps = daily.get("temperature_2m_max", [])[:7]
        humidities = daily.get("relative_humidity_2m_mean", [])[:7]

        days = []
        for index, date_str in enumerate(dates):
            temperature = round(float(temps[index])) if index < len(temps) else 0
            humidity = round(float(humidities[index])) if index < len(humidities) else 0
            risk_meta = calculate_forecast_risk(crop, temperature, humidity)
            days.append({
                "day": _safe_weekday(date_str, index),
                "date": date_str,
                "temperature": temperature,
                "humidity": humidity,
                **risk_meta,
            })

        if not days:
            raise ValueError("No forecast days available")

        summary, high_risk_days = get_forecast_summary(days)

        return {
            "location": DEFAULT_LOCATION,
            "summary": summary,
            "high_risk_days": high_risk_days,
            "days": days,
            "advice": get_forecast_advice(crop, days),
        }

    except Exception as e:
        days = _fallback_forecast_days(crop)
        summary, high_risk_days = get_forecast_summary(days)
        return {
            "location": DEFAULT_LOCATION,
            "summary": summary,
            "high_risk_days": high_risk_days,
            "days": days,
            "advice": get_forecast_advice(crop, days),
            "fallback": True,
            "error": str(e),
        }


def calculate_risk(disease_key: str, temperature: float, humidity: float) -> str:
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
        "high":    "Current weather conditions are highly favorable for disease spread. Take immediate action.",
        "medium":  "Weather conditions may support disease development. Monitor your crops closely.",
        "low":     "Current weather conditions are relatively safe. Continue regular monitoring.",
        "unknown": "Unable to assess weather risk at this time.",
    }
    return messages.get(risk_level, "Monitor your crops regularly.")
