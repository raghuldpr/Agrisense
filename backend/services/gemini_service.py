import os, json, re, base64
import requests
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

hf_client = InferenceClient(api_key=HF_API_TOKEN) if HF_API_TOKEN else None

if not GEMINI_API_KEY or GEMINI_API_KEY == "missing_key":
    print("[Gemini] WARNING: GEMINI_API_KEY not found in env")
else:
    print(f"[Gemini] API key loaded: {GEMINI_API_KEY[:8]}...")

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

def _get_season() -> str:
    from datetime import datetime
    month = datetime.now().month
    return "Kharif (monsoon)" if 6 <= month <= 11 else "Rabi (winter/spring)"

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
    if not ml_top3:
        return "  No ML predictions available."
    lines = []
    for i, pred in enumerate(ml_top3[:3], 1):
        disease = pred.get("disease_key", "Unknown").replace("_", " ")
        conf    = pred.get("confidence", 0) * 100
        lines.append(f"  {i}. {disease} ({conf:.1f}%)")
    return "\n".join(lines)

def _format_weather_context(weather: dict) -> str:
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
    try:
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
        
        print(f"[Gemini] Analyzing {crop} leaf — season={season}, weather={weather_context}")

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 512
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        resp.raise_for_status()
        
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"[Gemini] Raw response: {text}")

        json_match = re.search(r'\{.*?\}', text, re.DOTALL)
        if not json_match:
            print("[Gemini] No JSON found in response")
            return None

        result = json.loads(json_match.group())

        return {
            "disease_name": result.get("disease_name", "Unknown"),
            "confidence":   float(result.get("confidence", 0)),
            "risk_level":   result.get("risk_level", "medium"),
            "reasoning":    result.get("reasoning", ""),
            "source":       "gemini_vision",
        }

    except Exception as e:
        print(f"[Gemini] Error analyzing image: {e}")
        return None

CHAT_PROMPT_TEMPLATE = """You are an expert, friendly agricultural assistant helping a farmer.
Language constraint: You MUST respond purely in {language}. Do not use English unless the user's language is English.

Context:
- Crop: {crop}
- Location: {location}
- Known Disease/Issue: {disease}
- Weather: {weather_summary}

Farmer's Message: {message}

Rules:
- Be extremely concise and practical. No fluff.
- The JSON keys MUST remain exactly "answer", "action_steps", and "suggested_followups" in English.
- The VALUES inside the JSON MUST be translated into {language}.
- Respond ONLY with valid, raw JSON. Do not use markdown backticks like ```json ... ```.
- JSON structure:
{{
  "answer": "<short direct answer to farmer's query in {language}>",
  "action_steps": ["<step 1 in {language}>", "<step 2 in {language}>"],
  "suggested_followups": ["<related question 1 in {language}>", "<related question 2 in {language}>"]
}}
"""

def chat_with_farmer(
    message: str,
    crop: str,
    preferred_language: str,
    disease: str = None,
    weather_context: dict = None,
    location: str = None,
) -> dict:
    fallback_response = {
        "answer": "I'm having trouble connecting right now. Please try again later.",
        "action_steps": [],
        "suggested_followups": []
    }

    if not hf_client:
        print("[HF Chat] Error: hf_client is None. Check HF_API_TOKEN in .env.")
        return fallback_response

    try:
        weather_summary = _format_weather_context(weather_context)

        prompt = CHAT_PROMPT_TEMPLATE.format(
            language=preferred_language,
            crop=crop,
            location=location or "Unknown",
            disease=disease or "None identified",
            weather_summary=weather_summary,
            message=message
        )

        messages = [{"role": "user", "content": prompt}]
        
        completion = hf_client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct", 
            messages=messages, 
            max_tokens=600,
            temperature=0.3
        )
        
        text = completion.choices[0].message.content.strip()
        print(f"[HF Chat] Raw response: {text}")

        json_match = re.search(r'\{.*?\}', text, re.DOTALL)
        if not json_match:
            print("[HF Chat] No JSON found in response")
            return fallback_response

        result = json.loads(json_match.group())
        return {
            "answer": result.get("answer", "No answer provided."),
            "action_steps": result.get("action_steps", []),
            "suggested_followups": result.get("suggested_followups", [])
        }

    except Exception as e:
        import traceback
        print(f"[Gemini Chat] Error: {e}")
        traceback.print_exc()
        return {
            "answer": f"DEBUG HF ERROR: {e}",
            "action_steps": [],
            "suggested_followups": []
        }
