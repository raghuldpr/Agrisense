import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from models.classifier import classify_disease
from models.segmenter import segment_leaf

# Get absolute path to the test image
project_root = os.path.abspath(os.path.join(backend_dir, ".."))
image_path = os.path.join(project_root, "repos", "Plant-Disease-Detection", "uploaded_image.jpg")

if not os.path.exists(image_path):
    print(f"Error: test image not found at {image_path}")
    sys.exit(1)

print(f"Testing with image: {image_path}\n")

# 1. Classify
disease_key, confidence = classify_disease(image_path, "tomato")
print(f"Disease Key: {disease_key}")
print(f"Confidence: {confidence:.2%}\n")

# 2. Segment
seg_path = segment_leaf(image_path, disease_key)
print(f"Segmented image saved to: {seg_path}")