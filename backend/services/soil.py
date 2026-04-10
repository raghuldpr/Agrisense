import json
import os
from datetime import datetime
from typing import Dict, Optional

# ── Persistent File-Backed Storage ───────────────────────────────────────────
# Hugging Face Spaces free tier restarts the container frequently.
# Using an in-memory dict would wipe all soil data on every restart.
# We persist to /tmp/soil_db.json so data survives between readings.
# Note: /tmp is wiped on full container rebuilds (deploys), but survives
# the normal sleep/wake cycles that HF uses on free tier.
_DB_PATH = "/tmp/soil_db.json"

def _load_db() -> Dict[str, dict]:
    """Load the soil database from disk. Returns empty dict if not found."""
    try:
        if os.path.exists(_DB_PATH):
            with open(_DB_PATH, "r") as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"[SOIL_DB] Warning — could not load DB from disk: {e}")
    return {}

def _save_db(db: Dict[str, dict]) -> None:
    """Persist the soil database to disk."""
    try:
        with open(_DB_PATH, "w") as f:
            json.dump(db, f, indent=2)
    except OSError as e:
        print(f"[SOIL_DB] Warning — could not save DB to disk: {e}")

# Boot-time load: populate in-memory cache from disk
SOIL_DB: Dict[str, dict] = _load_db()
print(f"[SOIL_DB] Loaded {len(SOIL_DB)} device(s) from persistent storage.")


# ── Mock / Simulation ─────────────────────────────────────────────────────────
def get_mock_telemetry(device_id: str, crop: str = "tomato") -> dict:
    import random

    moisture = round(random.uniform(25.0, 85.0), 1)
    tds = round(random.uniform(250, 1000), 1)

    nutrient_status = "Optimal"
    if tds < 300:
        nutrient_status = "Low"
    elif tds > 800:
        nutrient_status = "High"

    now_str = datetime.now().isoformat()
    return {
        "device_id": device_id,
        "crop": crop,
        "moisture": moisture,
        "tds": tds,
        "temperature": round(random.uniform(22.0, 32.0), 1),
        "humidity": round(random.uniform(40.0, 75.0), 1),
        "nutrient_status": nutrient_status,
        "timestamp": now_str,
        "last_updated": now_str,
        "is_simulated": True,
    }


# ── Core Logic ────────────────────────────────────────────────────────────────
def _derive_nutrient_status(tds: float) -> str:
    """Derive nutrient status label from TDS reading."""
    if tds < 300:
        return "Low"
    if tds > 800:
        return "High"
    return "Optimal"


def process_soil_data(
    device_id: str,
    crop: str,
    moisture: float,
    tds: float,
    temperature: float,
    humidity: float,
    timestamp: str = None,
) -> dict:
    """Ingest a telemetry payload, store it (in memory + disk), and return the record."""
    if not timestamp:
        timestamp = datetime.now().isoformat()

    data = {
        "device_id": device_id,
        "crop": crop,
        "moisture": moisture,
        "tds": tds,
        "temperature": temperature,
        "humidity": humidity,
        "nutrient_status": _derive_nutrient_status(tds),
        "timestamp": timestamp,
        "last_updated": datetime.now().isoformat(),
        "server_received_at": datetime.now().isoformat(),
    }

    # Update in-memory cache
    SOIL_DB[device_id] = data

    # Persist to disk so data survives container sleep/wake cycles
    _save_db(SOIL_DB)

    print(f"[SOIL_DB] Saved telemetry for device={device_id!r}  moisture={moisture}%  tds={tds}ppm")
    return data


def get_latest_soil_data(device_id: str) -> Optional[dict]:
    """Retrieve the most recent telemetry record for a device."""
    # Always read from in-memory cache (which was loaded from disk at boot)
    return SOIL_DB.get(device_id)


def get_soil_advice(device_id: str, crop: str) -> dict:
    """Generate irrigation and nutrient advice from the latest telemetry."""
    data = SOIL_DB.get(device_id)
    if not data:
        return {
            "status": "No Data",
            "risk_flags": ["No telemetry received from this device."],
            "irrigation_suggestion": (
                "No readings found. Make sure your soil station is powered on "
                "and connected to Wi-Fi."
            ),
            "nutrient_suggestion": "Cannot determine — no sensor data available.",
            "timestamp": None,
        }

    moisture = data.get("moisture", 0)
    tds = data.get("tds", 0)

    risk_flags = []
    status = "Normal"
    irrigation_suggestion = "Soil moisture is adequate. No immediate watering needed."
    nutrient_suggestion = "Nutrient levels appear stable."

    # Moisture thresholds
    if moisture < 30:
        status = "Warning"
        risk_flags.append("Low Soil Moisture")
        irrigation_suggestion = "Water immediately. Moisture is critically low."
    elif moisture > 80:
        status = "Warning"
        risk_flags.append("High Soil Moisture")
        irrigation_suggestion = "Stop watering. Allow soil to drain to prevent root rot."

    # TDS / Nutrient thresholds
    if tds < 300:
        status = "Warning"
        risk_flags.append("Low Nutrients (TDS)")
        nutrient_suggestion = "Apply general NPK fertilizer to boost soil conductivity."
    elif tds > 1200:
        status = "Warning"
        risk_flags.append("High Salinity (TDS)")
        nutrient_suggestion = "Flush soil with fresh water to reduce salt accumulation."

    if status == "Warning":
        status = "Attention Required"

    return {
        "status": status,
        "risk_flags": risk_flags,
        "irrigation_suggestion": irrigation_suggestion,
        "nutrient_suggestion": nutrient_suggestion,
        "timestamp": data.get("timestamp"),
    }
