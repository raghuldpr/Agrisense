CLASS_LABELS = [
    "Pepper__bell___Bacterial_spot",
    "Pepper__bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Tomato_Bacterial_spot",
    "Tomato_Early_blight",
    "Tomato_Late_blight",
    "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato__Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato__Tomato_mosaic_virus",
    "Tomato_healthy",
]

# Map PlantVillage labels → our disease_info.json keys
LABEL_TO_DISEASE_KEY = {
    "Pepper__bell___Bacterial_spot": "Pepper_Bacterial_Spot",
    "Pepper__bell___healthy": "Pepper_Healthy",
    "Potato___Early_blight": "Potato_Early_Blight",
    "Potato___Late_blight": "Potato_Late_Blight",
    "Potato___healthy": "Potato_Healthy",
    "Tomato_Bacterial_spot": "Tomato_Bacterial_Spot",
    "Tomato_Early_blight": "Tomato_Early_Blight",
    "Tomato_Late_blight": "Tomato_Late_Blight",
    "Tomato_Leaf_Mold": "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot": "Tomato_Septoria_Leaf_Spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "Tomato_Early_Blight",  # fallback
    "Tomato__Target_Spot": "Tomato_Early_Blight",  # fallback
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "Tomato_Bacterial_Spot",  # fallback
    "Tomato__Tomato_mosaic_virus": "Tomato_Bacterial_Spot",  # fallback
    "Tomato_healthy": "Tomato_Healthy",
}

# Which crops each label belongs to
LABEL_CROP_MAP = {
    "tomato": [l for l in CLASS_LABELS if l.startswith("Tomato")],
    "potato": [l for l in CLASS_LABELS if l.startswith("Potato")],
    "pepper": [l for l in CLASS_LABELS if l.startswith("Pepper")],
}