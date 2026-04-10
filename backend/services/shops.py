"""
services/shops.py
─────────────────
Fetches REAL nearby agriculture shops using the OpenStreetMap Overpass API.
- Free, no API key, no billing
- Searches within 5 km of the user's GPS coordinates
- Tags: shop=agrarian, shop=garden_centre, shop=farm, shop=fertilizer,
        amenity=marketplace, shop=seeds
- Falls back to a small hardcoded set if Overpass is unreachable or returns 0 results
"""

import requests
from math import cos, radians, sqrt


# ── Constants ─────────────────────────────────────────────────────────────────
DEFAULT_LOCATION = "Coimbatore, Tamil Nadu"
DEFAULT_LAT = 11.0168
DEFAULT_LNG = 76.9558

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
SEARCH_RADIUS_M = 10000   # 10 km radius for better coverage in rural areas
TIMEOUT_SECONDS = 12
MAX_RESULTS = 15

# OSM tags that represent agriculture-related shops
AGRI_TAGS = [
    "shop=agrarian",
    "shop=garden_centre",
    "shop=farm",
    "shop=seeds",
    "shop=fertilizer",
    "shop=agricultural_supplies",
    "amenity=marketplace",
    "amenity=market",
    "shop=plant_nursery",
    "shop=nutrition_supplements",   # sometimes used for agri inputs in IN
    "shop=wholesale",               # wholesale agri supply stores
    "landuse=farmyard",
]

# No fallback mechanism used; if no shops are found, an empty list is sent.


# ── Helpers ───────────────────────────────────────────────────────────────────

def validate_coordinates(lat: float, lng: float) -> tuple[float, float]:
    if not (-90 <= lat <= 90):
        raise ValueError("Latitude must be between -90 and 90.")
    if not (-180 <= lng <= 180):
        raise ValueError("Longitude must be between -180 and 180.")
    return lat, lng


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat_km = (lat2 - lat1) * 111.0
    lng_km = (lng2 - lng1) * 111.0 * cos(radians((lat1 + lat2) / 2))
    return round(sqrt(lat_km ** 2 + lng_km ** 2), 2)


def _directions_url(lat: float, lng: float) -> str:
    """Real Google Maps link to navigate to the shop's exact coordinates."""
    return f"https://maps.google.com/?q={lat},{lng}"


def _build_overpass_query(lat: float, lng: float, radius_m: int) -> str:
    """
    Overpass QL query that searches for all agri-related OSM nodes/ways
    within `radius_m` metres of the given coordinates.
    """
    tag_filters = "\n  ".join(
        f'node["{tag.split("=")[0]}"="{tag.split("=")[1]}"](around:{radius_m},{lat},{lng});'
        for tag in AGRI_TAGS
    )
    return (
        f"[out:json][timeout:10];\n"
        f"(\n"
        f"  {tag_filters}\n"
        f");\n"
        f"out body;"
    )


def _parse_osm_element(element: dict) -> dict | None:
    """Convert a raw OSM element into a flat shop dict."""
    tags = element.get("tags", {})
    lat = element.get("lat")
    lng = element.get("lon")

    if lat is None or lng is None:
        return None

    name = (
        tags.get("name")
        or tags.get("name:en")
        or tags.get("brand")
        or tags.get("operator")
    )
    if not name:
        return None   # Skip unnamed elements

    phone = (
        tags.get("phone")
        or tags.get("contact:phone")
        or tags.get("mobile")
        or tags.get("contact:mobile")
    )
    # Normalise phone: strip spaces
    if phone:
        phone = phone.strip()

    city = tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village") or ""
    street = tags.get("addr:street") or ""
    housenumber = tags.get("addr:housenumber") or ""
    postcode = tags.get("addr:postcode") or ""

    address_parts = [p for p in [housenumber, street, city, postcode] if p]
    address = ", ".join(address_parts) if address_parts else "Address not available"

    return {
        "name": name,
        "lat": lat,
        "lng": lng,
        "phone": phone,
        "address": address,
        "rating": 0.0,       # OSM has no ratings
        "is_open": True,     # OSM has no real-time hours
    }


def _fetch_osm_shops(lat: float, lng: float) -> list[dict]:
    """Query Overpass API and return a list of raw shop dicts."""
    query = _build_overpass_query(lat, lng, SEARCH_RADIUS_M)
    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
        shops = [_parse_osm_element(e) for e in elements]
        return [s for s in shops if s is not None]
    except Exception as exc:
        print(f"[SHOPS] Overpass API error: {exc}")
        return []


def _normalize_shop(shop: dict, user_lat: float, user_lng: float, index: int) -> dict:
    distance_km = _distance_km(user_lat, user_lng, shop["lat"], shop["lng"])

    tag = None
    if index == 0:
        tag = "Nearest"
    elif shop.get("rating", 0) >= 4.6:
        tag = "Top rated"

    return {
        "name": shop["name"],
        "distance_km": distance_km,
        "rating": round(float(shop.get("rating", 0.0)), 1),
        "is_open": bool(shop.get("is_open", True)),
        "phone": shop.get("phone"),
        "address": shop["address"],
        "directions_url": _directions_url(shop["lat"], shop["lng"]),
        "tag": tag,
    }


# ── Public API ────────────────────────────────────────────────────────────────

def get_nearby_shops_response(lat: float, lng: float) -> dict:
    lat, lng = validate_coordinates(lat, lng)

    raw_shops = _fetch_osm_shops(lat, lng)
    raw_shops = _fetch_osm_shops(lat, lng)

    # Sort by distance to user
    sorted_shops = sorted(
        raw_shops,
        key=lambda s: _distance_km(lat, lng, s["lat"], s["lng"])
    )[:MAX_RESULTS]

    shops = [
        _normalize_shop(shop, lat, lng, index)
        for index, shop in enumerate(sorted_shops)
    ]

    return {
        "location": f"Near {round(lat, 4)}, {round(lng, 4)}",
        "shops": shops,
        "provider": "openstreetmap",
    }
