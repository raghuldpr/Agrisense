import os, json, re, base64
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("[Groq] WARNING: GROQ_API_KEY not found in .env")
else:
    print(f"[Groq] API key loaded: {GROQ_API_KEY[:8]}...")

client = Groq(api_key=GROQ_API_KEY)

DISEASE_LIST = {
    "tomato":    ["Early Blight", "Late Blight", "Leaf Mold",
                  "Septoria Leaf Spot", "Bacterial Spot", "Spider Mites",
                  "Target Spot", "Yellow Leaf Curl Virus", "Mosaic Virus", "Healthy"],
    "potato":    ["Early Blight", "Late Blight", "Healthy"],
    "pepper":    ["Bacterial Spot", "Healthy"],
    "rice":      ["Bacterial Blight", "Blast Disease", "Brown Spot",
                  "Leaf Blast", "False Smut", "Healthy"],
    "corn":      ["Common Rust", "Gray Leaf Spot", "Northern Leaf Blight", "Healthy"],
    "wheat":     ["Brown Rust", "Yellow Rust", "Healthy"],
    "sugarcane": ["Bacterial Blight", "Red Rot", "Healthy"],
}

# Season detection by month (India: Kharif = Jun–Nov, Rabi = Dec–May)
def _get_season() -> str:
    from datetime import datetime
    month = datetime.now().month
    return "Kharif (monsoon)" if 6 <= month <= 11 else "Rabi (winter/spring)"

# Disease prevalence hints for Tamil Nadu / South India
REGIONAL_HINTS = {
    "tomato":    "Early Blight and Late Blight are highly common in Tamil Nadu, especially post-monsoon.",
    "potato":    "Late Blight is the dominant threat in South Indian potato farms.",
    "pepper":    "Bacterial Spot is frequently reported in Tamil Nadu pepper crops.",
    "rice":      "Blast Disease and Bacterial Blight are the two most prevalent rice diseases in Tamil Nadu.",
    "corn":      "Common Rust is widespread across South Indian corn farms.",
    "wheat":     "Brown Rust is more common than Yellow Rust in South India.",
    "sugarcane": "Red Rot is the primary sugarcane threat in Tamil Nadu.",
}

ENHANCED_PROMPT_TEMPLATE = """You are an expert agricultural plant pathologist specializing in South Indian crops.

## Context
- Crop: {crop}
- Location: Tamil Nadu, India
- Season: {season}
- Current Weather: {weather_context}
- Regional note: {regional_hint}

## ML Model's Top Predictions (for reference)
{ml_top3}

## Your Task
Analyze this leaf image carefully and identify the disease.

Supported diseases for {crop}: {disease_list}

## Rules
- Only identify from the supported disease list above
- Cross-reference the ML predictions and weather context in your reasoning
- If weather conditions match a disease's known spreading conditions, factor that in
- If the leaf looks healthy with no visible lesions, return "Healthy"
- Provide a confidence score based on visual clarity, not just assumptions

Respond ONLY in this exact JSON format — no extra text, no markdown:
{{
  "disease_name": "Early Blight",
  "confidence": 87.5,
  "risk_level": "medium",
  "reasoning": "Dark concentric ring spots on older leaves consistent with Early Blight. High humidity (88%) aligns with fungal spread conditions. ML model also ranked Early Blight first."
}}

risk_level must be exactly one of: "high", "medium", "low", "none"
confidence must be a float between 0 and 100
"""


def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _format_ml_top3(ml_top3: list) -> str:
    """Format ML top-3 predictions into readable text for the prompt."""
    if not ml_top3:
        return "  No ML predictions available."
    lines = []
    for i, pred in enumerate(ml_top3[:3], 1):
        disease = pred.get("disease_key", "Unknown").replace("_", " ")
        conf    = pred.get("confidence", 0) * 100
        lines.append(f"  {i}. {disease} ({conf:.1f}%)")
    return "\n".join(lines)


def _format_weather_context(weather: dict) -> str:
    """Format weather dict into a readable string."""
    if not weather:
        return "Weather data unavailable."
    temp     = weather.get("temperature", "N/A")
    humidity = weather.get("humidity", "N/A")
    risk     = weather.get("risk_level", "unknown")
    return f"{temp}°C, {humidity}% humidity — disease spread risk: {risk}"


def analyze_with_gemini(
    image_path: str,
    crop: str,
    ml_top3: list = None,
    weather: dict = None,
) -> dict:
    """
    Enhanced Groq LLaVA analysis with context injection.
    Kept same function name so main.py import stays unchanged.

    Args:
        image_path: Path to leaf image
        crop:       Crop name (tomato, rice, etc.)
        ml_top3:    List of top-3 ML predictions [{disease_key, confidence}]
        weather:    Weather dict from get_weather_risk()
    """
    try:
        if not GROQ_API_KEY:
            print("[Groq] No API key, skipping")
            return None

        crop_lower      = crop.lower()
        disease_list    = DISEASE_LIST.get(crop_lower, [])
        season          = _get_season()
        weather_context = _format_weather_context(weather)
        regional_hint   = REGIONAL_HINTS.get(crop_lower, "No specific regional data available.")
        ml_top3_text    = _format_ml_top3(ml_top3 or [])

        prompt = ENHANCED_PROMPT_TEMPLATE.format(
            crop            = crop.capitalize(),
            season          = season,
            weather_context = weather_context,
            regional_hint   = regional_hint,
            ml_top3         = ml_top3_text,
            disease_list    = ", ".join(disease_list),
        )

        image_b64 = encode_image(image_path)
        image_url = f"data:image/jpeg;base64,{image_b64}"

        print(f"[Groq] Analyzing {crop} leaf — season={season}, weather={weather_context}")

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": image_url}},
                        {"type": "text",      "text": prompt},
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=512,
        )

        text = response.choices[0].message.content.strip()
        print(f"[Groq] Raw response: {text}")

        json_match = re.search(r'\{.*?\}', text, re.DOTALL)
        if not json_match:
            print("[Groq] No JSON found in response")
            return None

        result = json.loads(json_match.group())

        print(f"[Groq] ✅ Disease   : {result.get('disease_name')}")
        print(f"[Groq] ✅ Confidence: {result.get('confidence')}%")
        print(f"[Groq] ✅ Reasoning : {result.get('reasoning')}")

        return {
            "disease_name": result.get("disease_name", "Unknown"),
            "confidence":   float(result.get("confidence", 0)),
            "risk_level":   result.get("risk_level", "medium"),
            "reasoning":    result.get("reasoning", ""),
            "source":       "groq_llava",
        }

    except json.JSONDecodeError as e:
        print(f"[Groq] JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"[Groq] Error: {e}")
        return None
