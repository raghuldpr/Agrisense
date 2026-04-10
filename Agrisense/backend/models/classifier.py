"""
classifier.py  -  AgriSense Plant Disease Classifier
Models:
  - PRIMARY (Tomato/Pepper/Potato): linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
  - SECONDARY (Rice/Corn/Wheat/Sugarcane): LishaV01/agriculture-crop-disease-detection
Method: HuggingFace API (httpx) → Local Transformers fallback

Returns:
  classify_disease() → (disease_key: str, confidence: float, top3: list)
  top3 = [{"disease_key": str, "confidence": float}, ...]
"""
import os
import io
from PIL import Image
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

HF_BASE = "https://router.huggingface.co/hf-inference/models"

# ── Model A: linkanjarad  (Tomato / Pepper / Potato) ─────────────────────────
MODEL_A   = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
API_URL_A = f"{HF_BASE}/{MODEL_A}"

LABEL_MAP_A = {
    "Healthy Tomato Plant":                                "Tomato_Healthy",
    "Tomato with Bacterial Spot":                          "Tomato_Bacterial_Spot",
    "Tomato with Early Blight":                            "Tomato_Early_Blight",
    "Tomato with Late Blight":                             "Tomato_Late_Blight",
    "Tomato with Leaf Mold":                               "Tomato_Leaf_Mold",
    "Tomato with Septoria Leaf Spot":                      "Tomato_Septoria_Leaf_Spot",
    "Tomato with Spider Mites or Two-spotted Spider Mite": "Tomato_Spider_Mites",
    "Tomato with Target Spot":                             "Tomato_Target_Spot",
    "Tomato Yellow Leaf Curl Virus":                       "Tomato_Yellow_Leaf_Curl",
    "Tomato Mosaic Virus":                                 "Tomato_Mosaic_Virus",
    "Healthy Potato Plant":                                "Potato_Healthy",
    "Potato with Early Blight":                            "Potato_Early_Blight",
    "Potato with Late Blight":                             "Potato_Late_Blight",
    "Healthy Bell Pepper Plant":                           "Pepper_Healthy",
    "Bell Pepper with Bacterial Spot":                     "Pepper_Bacterial_Spot",
    "Apple Scab":                                          "Apple_Scab",
    "Apple with Black Rot":                                "Apple_Black_Rot",
    "Cedar Apple Rust":                                    "Apple_Cedar_Rust",
    "Healthy Apple":                                       "Apple_Healthy",
    "Cherry with Powdery Mildew":                          "Cherry_Powdery_Mildew",
    "Healthy Cherry Plant":                                "Cherry_Healthy",
    "Corn (Maize) with Cercospora and Gray Leaf Spot":     "Corn_Gray_Leaf_Spot",
    "Corn (Maize) with Common Rust":                       "Corn_Common_Rust",
    "Corn (Maize) with Northern Leaf Blight":              "Corn_Northern_Blight",
    "Healthy Corn (Maize) Plant":                          "Corn_Healthy",
    "Grape with Black Rot":                                "Grape_Black_Rot",
    "Grape with Esca (Black Measles)":                     "Grape_Esca",
    "Grape with Isariopsis Leaf Spot":                     "Grape_Leaf_Spot",
    "Healthy Grape Plant":                                 "Grape_Healthy",
    "Orange with Citrus Greening":                         "Orange_Citrus_Greening",
    "Peach with Bacterial Spot":                           "Peach_Bacterial_Spot",
    "Healthy Peach Plant":                                 "Peach_Healthy",
    "Healthy Raspberry Plant":                             "Raspberry_Healthy",
    "Healthy Soybean Plant":                               "Soybean_Healthy",
    "Squash with Powdery Mildew":                          "Squash_Powdery_Mildew",
    "Strawberry with Leaf Scorch":                         "Strawberry_Leaf_Scorch",
    "Healthy Strawberry Plant":                            "Strawberry_Healthy",
    "Healthy Blueberry Plant":                             "Blueberry_Healthy",
}

CROP_KEYWORDS_A = {
    "tomato":     ["Tomato"],
    "potato":     ["Potato"],
    "pepper":     ["Pepper", "Bell Pepper"],
    "apple":      ["Apple"],
    "cherry":     ["Cherry"],
    "corn":       ["Corn", "Maize"],
    "maize":      ["Corn", "Maize"],
    "grape":      ["Grape"],
    "orange":     ["Orange"],
    "peach":      ["Peach"],
    "raspberry":  ["Raspberry"],
    "soybean":    ["Soybean"],
    "squash":     ["Squash"],
    "strawberry": ["Strawberry"],
    "blueberry":  ["Blueberry"],
}

# ── Model B: LishaV01 ─────────────────────────────────────────────────────────
MODEL_B   = "LishaV01/agriculture-crop-disease-detection"
API_URL_B = f"{HF_BASE}/{MODEL_B}"

LABEL_MAP_B = {
    "Corn___Common_Rust":            "Corn_Common_Rust",
    "Corn___Gray_Leaf_Spot":         "Corn_Gray_Leaf_Spot",
    "Corn___Healthy":                "Corn_Healthy",
    "Potato___Early_Blight":         "Potato_Early_Blight",
    "Potato___Healthy":              "Potato_Healthy",
    "Potato___Late_Blight":          "Potato_Late_Blight",
    "Rice___Brown_Spot":             "Rice_Brown_Spot",
    "Rice___Healthy":                "Rice_Healthy",
    "Rice___Leaf_Blast":             "Rice_Leaf_Blast",
    "Rice_Bacterial Blight Disease": "Rice_Bacterial_Blight",
    "Rice_Blast Disease":            "Rice_Blast",
    "Rice_Brown Spot Disease":       "Rice_Brown_Spot",
    "Rice_False Smut Disease":       "Rice_False_Smut",
    "Wheat___Brown_Rust":            "Wheat_Brown_Rust",
    "Wheat___Healthy":               "Wheat_Healthy",
    "Wheat___Yellow_Rust":           "Wheat_Yellow_Rust",
    "sugarcane_Bacterial Blight":    "Sugarcane_Bacterial_Blight",
    "sugarcane_Healthy":             "Sugarcane_Healthy",
    "sugarcane_Red Rot":             "Sugarcane_Red_Rot",
    "Invalid":                       "Unknown_Disease",
}

MODEL_B_CROPS = {"rice", "wheat", "sugarcane", "barley"}

CROP_HEALTHY = {
    "tomato":    "Tomato_Healthy",  "potato":    "Potato_Healthy",
    "pepper":    "Pepper_Healthy",  "rice":      "Rice_Healthy",
    "corn":      "Corn_Healthy",    "maize":     "Corn_Healthy",
    "wheat":     "Wheat_Healthy",   "sugarcane": "Sugarcane_Healthy",
}

_cache_A = {"processor": None, "model": None, "id2label": {}}
_cache_B = {"processor": None, "model": None, "id2label": {}}


# ── Image prep ────────────────────────────────────────────────────────────────
def prepare_image(image_path: str) -> bytes:
    img = Image.open(image_path).convert("RGB")
    img = img.resize((224, 224), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ── Label mappers ─────────────────────────────────────────────────────────────
def map_label_a(label: str, crop: str) -> str:
    if label in LABEL_MAP_A:
        return LABEL_MAP_A[label]
    for key, val in LABEL_MAP_A.items():
        if key.lower() in label.lower():
            return val
    if "healthy" in label.lower():
        return CROP_HEALTHY.get(crop.lower(), "Unknown_Disease")
    return CROP_HEALTHY.get(crop.lower(), "Unknown_Disease")


def map_label_b(label: str, crop: str) -> str:
    if label in LABEL_MAP_B:
        return LABEL_MAP_B[label]
    for key, val in LABEL_MAP_B.items():
        if key.lower() in label.lower():
            return val
    if "healthy" in label.lower():
        return CROP_HEALTHY.get(crop.lower(), "Unknown_Disease")
    return CROP_HEALTHY.get(crop.lower(), "Unknown_Disease")


# ── Filter results by crop keywords ──────────────────────────────────────────
def filter_results(results: list, keywords: list) -> list:
    if not keywords:
        return results
    filtered = [r for r in results
                if any(kw.lower() in r.get("label", "").lower() for kw in keywords)]
    return filtered if filtered else results


# ── HuggingFace API call ──────────────────────────────────────────────────────
def _api_call(api_url: str, image_path: str) -> list:
    import httpx
    token = os.getenv("HF_API_TOKEN", "")
    if not token:
        raise Exception("No HF_API_TOKEN in .env")

    data = prepare_image(image_path)
    print(f"[*] Sending {len(data)/1024:.1f} KB → {api_url.split('/')[-1]}")

    with httpx.Client(http2=True, timeout=30) as client:
        r = client.post(
            api_url,
            headers={"Authorization": f"Bearer {token}",
                     "Content-Type": "application/octet-stream"},
            content=data,
        )

    if r.status_code != 200:
        raise Exception(f"API {r.status_code}: {r.text[:200]}")

    results = r.json()
    if not isinstance(results, list) or not results:
        raise Exception("Empty API response")
    return results


# ── Top-3 extractor helpers ───────────────────────────────────────────────────
def _extract_top3_a(results: list, crop: str, keywords: list) -> list:
    """Return top-3 mapped predictions from Model A results."""
    cands  = filter_results(results, keywords)
    sorted_cands = sorted(cands, key=lambda x: x.get("score", 0), reverse=True)
    top3 = []
    for r in sorted_cands[:3]:
        disease_key = map_label_a(r["label"], crop)
        if disease_key != "Unknown_Disease":
            top3.append({"disease_key": disease_key, "confidence": float(r["score"])})
    return top3


def _extract_top3_b(results: list, crop: str, keywords: list) -> list:
    """Return top-3 mapped predictions from Model B results."""
    cands  = filter_results(results, keywords)
    sorted_cands = sorted(cands, key=lambda x: x.get("score", 0), reverse=True)
    top3 = []
    for r in sorted_cands[:3]:
        label = r["label"]
        if label == "Invalid":
            continue
        disease_key = map_label_b(label, crop)
        if disease_key != "Unknown_Disease":
            top3.append({"disease_key": disease_key, "confidence": float(r["score"])})
    return top3


# ── Model A — API ─────────────────────────────────────────────────────────────
def classify_via_api_a(image_path: str, crop: str) -> tuple:
    results  = _api_call(API_URL_A, image_path)
    keywords = CROP_KEYWORDS_A.get(crop.lower(), [])
    cands    = filter_results(results, keywords)

    print(f"[DEBUG Model-A] Top results for crop={crop!r}:")
    for r in cands[:5]:
        print(f"  {r.get('label'):55s}  {r.get('score', 0):.4f}")

    best  = max(cands, key=lambda x: x.get("score", 0))
    label = best["label"]
    score = float(best["score"])
    top3  = _extract_top3_a(results, crop, keywords)

    if score < 0.50:
        print(f"[!] Model-A low confidence ({score:.2%}) → Unknown_Disease")
        return "Unknown_Disease", score, top3

    disease_key = map_label_a(label, crop)
    print(f"[*] Model-A result: {label!r} → {disease_key} ({score:.2%})")
    return disease_key, score, top3


# ── Model B — API ─────────────────────────────────────────────────────────────
def classify_via_api_b(image_path: str, crop: str) -> tuple:
    results  = _api_call(API_URL_B, image_path)
    kw_map   = {"rice": ["Rice"], "wheat": ["Wheat"],
                "sugarcane": ["sugarcane"], "corn": ["Corn"], "maize": ["Corn"]}
    keywords = kw_map.get(crop.lower(), [])
    cands    = filter_results(results, keywords)

    print(f"[DEBUG Model-B] Top results for crop={crop!r}:")
    for r in cands[:5]:
        print(f"  {r.get('label'):55s}  {r.get('score', 0):.4f}")

    best  = max(cands, key=lambda x: x.get("score", 0))
    label = best["label"]
    score = float(best["score"])
    top3  = _extract_top3_b(results, crop, keywords)

    if score < 0.50 or label == "Invalid":
        print(f"[!] Model-B low confidence ({score:.2%}) → Unknown_Disease")
        return "Unknown_Disease", score, top3

    disease_key = map_label_b(label, crop)
    print(f"[*] Model-B result: {label!r} → {disease_key} ({score:.2%})")
    return disease_key, score, top3


# ── Model A — local fallback ──────────────────────────────────────────────────
def classify_via_local_a(image_path: str, crop: str) -> tuple:
    global _cache_A
    print("[!] Falling back to local Model-A...")
    if _cache_A["model"] is None:
        from transformers import MobileNetV2ImageProcessor, AutoModelForImageClassification
        _cache_A["processor"] = MobileNetV2ImageProcessor.from_pretrained(MODEL_A)
        _cache_A["model"]     = AutoModelForImageClassification.from_pretrained(MODEL_A)
        _cache_A["model"].eval()
        _cache_A["id2label"]  = _cache_A["model"].config.id2label
        print(f"[*] Local Model-A ready — {len(_cache_A['id2label'])} classes")

    import torch
    image  = Image.open(image_path).convert("RGB")
    inputs = _cache_A["processor"](images=image, return_tensors="pt")
    with torch.no_grad():
        logits = _cache_A["model"](**inputs).logits
    probs = torch.softmax(logits, dim=-1)[0]

    keywords = CROP_KEYWORDS_A.get(crop.lower(), [])
    indices  = []
    if keywords:
        indices = [i for i, lbl in _cache_A["id2label"].items()
                   if any(kw.lower() in lbl.lower() for kw in keywords)]
        if indices:
            mask = torch.zeros_like(probs)
            for i in indices:
                mask[i] = probs[i]
            probs = mask / mask.sum()

    # Top-3
    top_indices = probs.topk(min(3, len(probs))).indices.tolist()
    top3 = []
    for idx in top_indices:
        lbl  = _cache_A["id2label"][idx]
        conf = float(probs[idx])
        dk   = map_label_a(lbl, crop)
        if dk != "Unknown_Disease" and conf > 0.01:
            top3.append({"disease_key": dk, "confidence": conf})

    best_idx   = int(probs.argmax())
    confidence = float(probs[best_idx])
    label      = _cache_A["id2label"][best_idx]

    print(f"[DEBUG Model-A local] top: idx={best_idx} label={label!r} conf={confidence:.4f}")
    if confidence < 0.50:
        return "Unknown_Disease", confidence, top3

    disease_key = map_label_a(label, crop)
    print(f"[*] Local Model-A: {label!r} → {disease_key} ({confidence:.2%})")
    return disease_key, confidence, top3


# ── Model B — local fallback ──────────────────────────────────────────────────
def classify_via_local_b(image_path: str, crop: str) -> tuple:
    global _cache_B
    print("[!] Falling back to local Model-B...")
    if _cache_B["model"] is None:
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        _cache_B["processor"] = AutoImageProcessor.from_pretrained(MODEL_B)
        _cache_B["model"]     = AutoModelForImageClassification.from_pretrained(MODEL_B)
        _cache_B["model"].eval()
        _cache_B["id2label"]  = _cache_B["model"].config.id2label
        print(f"[*] Local Model-B ready — {len(_cache_B['id2label'])} classes")

    import torch
    image  = Image.open(image_path).convert("RGB")
    inputs = _cache_B["processor"](images=image, return_tensors="pt")
    with torch.no_grad():
        logits = _cache_B["model"](**inputs).logits
    probs = torch.softmax(logits, dim=-1)[0]

    kw_map   = {"rice": ["Rice"], "wheat": ["Wheat"],
                "sugarcane": ["sugarcane"], "corn": ["Corn"], "maize": ["Corn"]}
    keywords = kw_map.get(crop.lower(), [])
    if keywords:
        indices = [i for i, lbl in _cache_B["id2label"].items()
                   if any(kw.lower() in lbl.lower() for kw in keywords)]
        if indices:
            mask = torch.zeros_like(probs)
            for i in indices:
                mask[i] = probs[i]
            probs = mask / mask.sum()

    top_indices = probs.topk(min(3, len(probs))).indices.tolist()
    top3 = []
    for idx in top_indices:
        lbl  = _cache_B["id2label"][idx]
        conf = float(probs[idx])
        dk   = map_label_b(lbl, crop)
        if dk != "Unknown_Disease" and lbl != "Invalid" and conf > 0.01:
            top3.append({"disease_key": dk, "confidence": conf})

    best_idx   = int(probs.argmax())
    confidence = float(probs[best_idx])
    label      = _cache_B["id2label"][best_idx]

    print(f"[DEBUG Model-B local] top: idx={best_idx} label={label!r} conf={confidence:.4f}")
    if confidence < 0.50 or label == "Invalid":
        return "Unknown_Disease", confidence, top3

    disease_key = map_label_b(label, crop)
    print(f"[*] Local Model-B: {label!r} → {disease_key} ({confidence:.2%})")
    return disease_key, confidence, top3


# ── Main entry point ──────────────────────────────────────────────────────────
def classify_disease(image_path: str, crop: str) -> tuple:
    """
    Returns: (disease_key: str, confidence: float, top3: list)
    top3 = [{"disease_key": str, "confidence": float}, ...]
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    use_b = crop.lower() in MODEL_B_CROPS
    print(f"[*] classify_disease: crop={crop!r}  model={'B (LishaV01)' if use_b else 'A (linkanjarad)'}")

    if use_b:
        try:
            return classify_via_api_b(image_path, crop)
        except Exception as e:
            print(f"[!] Model-B API failed: {e}")
            return classify_via_local_b(image_path, crop)
    else:
        try:
            return classify_via_api_a(image_path, crop)
        except Exception as e:
            print(f"[!] Model-A API failed: {e}")
            return classify_via_local_a(image_path, crop)
