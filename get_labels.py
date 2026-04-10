import os
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
from transformers import AutoModelForImageClassification

MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
print("Loading model config...")
model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
print("Labels mapping:")
for k, v in model.config.id2label.items():
    print(f"{k}: {v}")
