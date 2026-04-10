import cv2
import numpy as np
import os
import uuid
from PIL import Image

OUTPUT_DIR = "/tmp/temp_uploads"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Color map for different disease risk levels
RISK_COLORS = {
    "high":    (0, 0, 255),    # Red (BGR)
    "medium":  (0, 165, 255),  # Orange
    "low":     (0, 255, 255),  # Yellow
    "none":    (0, 255, 0),    # Green
    "unknown": (128, 128, 128) # Grey
}

# Disease risk level map
DISEASE_RISK = {
    "Tomato_Early_Blight":        "medium",
    "Tomato_Late_Blight":         "high",
    "Tomato_Leaf_Mold":           "medium",
    "Tomato_Septoria_Leaf_Spot":  "medium",
    "Tomato_Bacterial_Spot":      "high",
    "Tomato_Healthy":             "none",
    "Potato_Early_Blight":        "medium",
    "Potato_Late_Blight":         "high",
    "Potato_Healthy":             "none",
    "Pepper_Bacterial_Spot":      "high",
    "Pepper_Healthy":             "none",
}


def segment_leaf(image_path: str, disease_key: str) -> str:
    """
    Detects and highlights infected regions on a leaf image.
    Returns path to the annotated output image.
    """
    risk_level = DISEASE_RISK.get(disease_key, "unknown")

    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    img = cv2.resize(img, (512, 512))
    output = img.copy()

    if risk_level == "none":
        # Healthy — draw green border only
        output = draw_healthy_overlay(output)
    else:
        # Diseased — detect and highlight infected regions
        output = highlight_infected_regions(img, output, risk_level)

    # Add disease label banner at top
    output = add_label_banner(output, disease_key, risk_level)

    # Save output
    out_filename = f"seg_{uuid.uuid4()}.jpg"
    out_path = os.path.join(OUTPUT_DIR, out_filename)
    cv2.imwrite(out_path, output)

    return out_path


def highlight_infected_regions(original: np.ndarray,
                                output: np.ndarray,
                                risk_level: str) -> np.ndarray:
    """
    Uses color segmentation to find diseased spots on leaf.
    Diseased areas typically appear as brown, yellow, or dark patches.
    """
    hsv = cv2.cvtColor(original, cv2.COLOR_BGR2HSV)

    # ── Detect brown/yellow disease spots ──────────────────────
    # Brown spots (early/late blight, bacterial spot)
    lower_brown = np.array([5, 50, 20])
    upper_brown = np.array([30, 255, 200])
    mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)

    # Yellow spots (leaf mold, septoria)
    lower_yellow = np.array([20, 50, 100])
    upper_yellow = np.array([40, 255, 255])
    mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # Dark necrotic spots (late blight)
    lower_dark = np.array([0, 0, 0])
    upper_dark = np.array([180, 255, 60])
    mask_dark = cv2.inRange(hsv, lower_dark, upper_dark)

    # Combine all disease masks
    disease_mask = cv2.bitwise_or(mask_brown, mask_yellow)
    disease_mask = cv2.bitwise_or(disease_mask, mask_dark)

    # ── Remove background (non-leaf areas) ────────────────────
    # Detect green leaf area
    lower_green = np.array([35, 30, 30])
    upper_green = np.array([90, 255, 255])
    leaf_mask = cv2.inRange(hsv, lower_green, upper_green)

    # Expand leaf mask slightly to include diseased edges
    kernel = np.ones((15, 15), np.uint8)
    leaf_mask_expanded = cv2.dilate(leaf_mask, kernel, iterations=3)

    # Keep only disease spots that are ON the leaf
    disease_mask = cv2.bitwise_and(disease_mask, leaf_mask_expanded)

    # ── Clean up mask ──────────────────────────────────────────
    kernel_clean = np.ones((5, 5), np.uint8)
    disease_mask = cv2.morphologyEx(disease_mask, cv2.MORPH_CLOSE, kernel_clean)
    disease_mask = cv2.morphologyEx(disease_mask, cv2.MORPH_OPEN, kernel_clean)

    # ── Draw contours around infected regions ─────────────────
    contours, _ = cv2.findContours(
        disease_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    highlight_color = RISK_COLORS.get(risk_level, (0, 165, 255))
    significant_contours = [c for c in contours if cv2.contourArea(c) > 100]

    if significant_contours:
        for contour in significant_contours:
            # Fill infected region with semi-transparent color
            mask_overlay = np.zeros_like(output)
            cv2.drawContours(mask_overlay, [contour], -1, highlight_color, -1)
            output = cv2.addWeighted(output, 1.0, mask_overlay, 0.35, 0)

            # Draw contour border
            cv2.drawContours(output, [contour], -1, highlight_color, 2)

            # Add area label
            M = cv2.moments(contour)
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                area_pct = (cv2.contourArea(contour) / (512 * 512)) * 100
                if area_pct > 0.5:
                    cv2.putText(
                        output,
                        f"{area_pct:.1f}%",
                        (cx - 20, cy),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.45,
                        highlight_color,
                        1,
                        cv2.LINE_AA,
                    )
    else:
        # No contours found — draw general warning overlay
        output = draw_general_warning(output, risk_level)

    # ── Draw border ────────────────────────────────────────────
    border_color = RISK_COLORS.get(risk_level, (128, 128, 128))
    cv2.rectangle(output, (0, 0), (511, 511), border_color, 4)

    return output


def draw_healthy_overlay(img: np.ndarray) -> np.ndarray:
    """Green border + checkmark for healthy leaves."""
    output = img.copy()
    cv2.rectangle(output, (0, 0), (511, 511), (0, 200, 0), 4)
    cv2.putText(
        output, "HEALTHY",
        (180, 490),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0, (0, 200, 0), 2, cv2.LINE_AA
    )
    return output


def draw_general_warning(img: np.ndarray, risk_level: str) -> np.ndarray:
    """Fallback — semi-transparent warning overlay when no contours found."""
    output = img.copy()
    overlay = output.copy()
    color = RISK_COLORS.get(risk_level, (128, 128, 128))
    cv2.rectangle(overlay, (10, 10), (502, 502), color, -1)
    output = cv2.addWeighted(output, 0.85, overlay, 0.15, 0)
    return output


def add_label_banner(img: np.ndarray,
                     disease_key: str,
                     risk_level: str) -> np.ndarray:
    """Adds a label banner at the bottom of the image."""
    output = img.copy()
    banner_color = RISK_COLORS.get(risk_level, (128, 128, 128))

    # Semi-transparent banner
    overlay = output.copy()
    cv2.rectangle(overlay, (0, 468), (512, 512), (0, 0, 0), -1)
    output = cv2.addWeighted(output, 0.6, overlay, 0.4, 0)

    # Disease name text
    label = disease_key.replace("_", " ")
    cv2.putText(
        output, label,
        (10, 492),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55, banner_color, 1, cv2.LINE_AA
    )

    # Risk badge
    risk_text = f"RISK: {risk_level.upper()}"
    cv2.putText(
        output, risk_text,
        (340, 492),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55, banner_color, 1, cv2.LINE_AA
    )

    return output