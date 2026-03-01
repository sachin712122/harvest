"""
AgriVision – AI-Powered Agricultural Decision Support Platform
Flask backend server
"""

import io
import os
import json
import pickle
import logging
import threading
import math
from datetime import datetime, timedelta

import numpy as np
import requests
from flask import Flask, jsonify, render_template, request
from sklearn.ensemble import RandomForestRegressor

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload

# ---------------------------------------------------------------------------
# ML model: build / load
# ---------------------------------------------------------------------------

MODEL_PATH = os.path.join(os.path.dirname(__file__), "yield_model.pkl")
_model = None
_model_lock = threading.Lock()

CROP_FACTORS = {
    # Yield multipliers relative to the base ML model (trained on rice data).
    # Factors are approximate ratios derived from typical Indian agricultural
    # yield statistics (ICAR / Ministry of Agriculture) scaled to kg/acre.

    # ── Food Grains ──────────────────────────────────────────────────────────
    "rice":          1.00,
    "wheat":         0.75,
    "maize":         1.15,
    "ragi":          0.29,   # Finger millet
    "cumbu":         0.32,   # Pearl millet
    "thinai":        0.21,   # Foxtail millet
    "kodo_millet":   0.18,
    "little_millet": 0.18,
    "barley":        0.40,
    "sorghum":       0.35,   # Jowar

    # ── Pulses ────────────────────────────────────────────────────────────────
    "black_gram":    0.14,   # Urad dal
    "green_gram":    0.13,   # Moong dal
    "red_gram":      0.18,   # Tur dal
    "horse_gram":    0.14,
    "chickpea":      0.20,   # Gram

    # ── Oilseeds ──────────────────────────────────────────────────────────────
    "groundnut":     0.60,
    "sesame":        0.11,   # Gingelly
    "coconut":       0.32,
    "castor":        0.21,
    "sunflower":     0.20,
    "soybean":       0.55,
    "mustard":       0.30,

    # ── Commercial / Cash Crops ───────────────────────────────────────────────
    "sugarcane":     12.0,
    "cotton":        0.28,
    "tobacco":       0.20,

    # ── Plantation Crops ──────────────────────────────────────────────────────
    "coffee":        0.07,
    "tea":           0.14,
    "rubber":        0.20,

    # ── Spices ────────────────────────────────────────────────────────────────
    "turmeric":      0.40,
    "chilli":        0.20,
    "coriander":     0.14,
    "pepper":        0.07,
    "cardamom":      0.03,

    # ── Fruits ────────────────────────────────────────────────────────────────
    "banana":        6.29,
    "mango":         1.61,
    "sapota":        2.00,
    "guava":         2.50,
    "papaya":        5.71,
    "jackfruit":     2.86,

    # ── Vegetables ────────────────────────────────────────────────────────────
    "tomato":        5.00,
    "brinjal":       3.57,
    "onion":         2.50,
    "drumstick":     0.71,
    "bhindi":        1.25,
    "tapioca":       3.57,
    "potato":        2.50,
    "cabbage":       3.00,

    # ── Floriculture ──────────────────────────────────────────────────────────
    "jasmine":       0.36,
    "rose":          0.43,
    "marigold":      0.89,
    "tuberose":      0.54,
}

# Mapping from internal crop key → crop_name in crops.json
CROP_DATA_MAP = {
    "rice":      "Rice (Paddy)",
    "wheat":     "Wheat",
    "maize":     "Maize",
    "cotton":    "Cotton",
    "soybean":   "Soybean",
    "barley":    "Barley",
    "groundnut": "Groundnut (Peanut)",
    "sorghum":   "Sorghum (Jowar)",
    "cumbu":     "Millet (Pearl Millet / Bajra)",
    "sugarcane": "Sugarcane",
    "chickpea":  "Chickpea (Gram)",
    "mustard":   "Mustard",
    "sunflower": "Sunflower",
    "potato":    "Potato",
    "tomato":    "Tomato",
    "onion":     "Onion",
    "brinjal":   "Brinjal (Eggplant)",
    "chilli":    "Chili (Green/Red)",
    "cabbage":   "Cabbage",
}

_CROPS_DATA: dict | None = None
_CROPS_DATA_FILE = os.path.join(os.path.dirname(__file__), "static", "data", "crops.json")


def get_crops_data() -> dict:
    """Load crops.json once and return a dict keyed by crop_name."""
    global _CROPS_DATA
    if _CROPS_DATA is None:
        with open(_CROPS_DATA_FILE, encoding="utf-8") as fh:
            _CROPS_DATA = {c["crop_name"]: c for c in json.load(fh)}
    return _CROPS_DATA


def compute_crop_suitability(crop_info: dict, temperature: float, seasonal_rainfall: float) -> dict:
    """
    Compute a suitability score (0.50–1.00) for given temperature and
    30-day rainfall vs a crop's ideal conditions from crops.json.
    Returns a dict with per-factor scores and overall suitability.
    """
    t_min = crop_info["ideal_temp_min_c"]
    t_max = crop_info["ideal_temp_max_c"]
    t_opt = crop_info["optimal_temp_c"]

    if t_min <= temperature <= t_max:
        # Normalise deviation against the half-range; fall back to 1.0 when
        # the crop has no temperature spread (t_min == t_max), meaning any
        # temperature within that exact point is already at the optimum.
        half_range = (t_max - t_min) / 2.0 if (t_max - t_min) > 0 else 1.0
        deviation = abs(temperature - t_opt) / half_range
        temp_score = round(max(0.70, 1.0 - deviation * 0.30), 3)
    else:
        outside_by = min(abs(temperature - t_min), abs(temperature - t_max))
        temp_score = round(max(0.50, 1.0 - outside_by * 0.04), 3)

    crop_duration = crop_info["crop_duration_days"]
    seasonal_req = crop_info["water_requirement_mm_per_season"]
    # weather["seasonal_rainfall"] is a 30-day accumulated total; scale it
    # to the crop's full growing season to compare with water_requirement.
    estimated_seasonal = (seasonal_rainfall / 30.0) * crop_duration
    if seasonal_req > 0:
        ratio = estimated_seasonal / seasonal_req
        if ratio >= 1.0:
            rainfall_score = round(max(0.70, 1.0 - (ratio - 1.0) * 0.15), 3)
        else:
            rainfall_score = round(max(0.50, ratio), 3)
    else:
        rainfall_score = 1.0

    overall = round((temp_score + rainfall_score) / 2.0, 3)
    return {
        "temperature_score": temp_score,
        "rainfall_score": rainfall_score,
        "overall_suitability": overall,
        "optimal_temp_c": t_opt,
        "temp_range": f"{t_min}–{t_max} °C",
        "water_requirement_mm": seasonal_req,
        "suitable_soils": crop_info.get("suitable_soil_types", []),
        "flood_tolerance": crop_info.get("flood_tolerance", ""),
        "drought_tolerance": crop_info.get("drought_tolerance", ""),
    }

SOIL_TYPES = {
    "alluvial": 0,
    "black": 1,
    "red loamy": 2,
    "laterite": 3,
    "sandy loam": 4,
    "clay": 5,
}

SEASONS = {"kharif": 0, "rabi": 1, "zaid": 2}


def _build_model():
    """Train a Random Forest on synthetic historical data and return it."""
    rng = np.random.default_rng(42)
    n = 5000

    temperature = rng.uniform(20, 38, n)
    rainfall = rng.uniform(400, 1800, n)
    humidity = rng.uniform(40, 95, n)
    soil_type = rng.integers(0, len(SOIL_TYPES), n)
    soil_moisture = rng.uniform(15, 70, n)
    hist_yield = rng.uniform(1500, 4000, n)
    season = rng.integers(0, len(SEASONS), n)

    # Yield formula with domain knowledge + noise
    y = (
        0.8 * hist_yield
        + 12 * rainfall
        - 30 * np.abs(temperature - 28)
        + 5 * humidity
        + 8 * soil_moisture
        - 80 * soil_type
        + 200 * (season == 0)           # Kharif boost
        + rng.normal(0, 150, n)
    )
    y = np.clip(y, 800, 5000)

    X = np.column_stack(
        [temperature, rainfall, humidity, soil_type, soil_moisture, hist_yield, season]
    )

    model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    model.fit(X, y)
    return model


def get_model():
    """Return the singleton ML model, loading or building as needed."""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        if os.path.exists(MODEL_PATH):
            logger.info("Loading cached ML model from %s", MODEL_PATH)
            with open(MODEL_PATH, "rb") as fh:
                _model = pickle.load(fh)
        else:
            logger.info("Training new ML model …")
            _model = _build_model()
            with open(MODEL_PATH, "wb") as fh:
                pickle.dump(_model, fh)
            logger.info("ML model saved to %s", MODEL_PATH)
    return _model


# Warm up model at startup in the background
threading.Thread(target=get_model, daemon=True).start()

# ---------------------------------------------------------------------------
# Helper: external data fetching
# ---------------------------------------------------------------------------

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

HEADERS = {"User-Agent": "HarvestYieldPredictor/1.0"}
TIMEOUT = 10


def fetch_location_info(lat: float, lon: float) -> dict:
    """Reverse-geocode coordinates via Nominatim."""
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address", {})
        return {
            "display_name": data.get("display_name", "Unknown"),
            "district": addr.get("county") or addr.get("city_district") or addr.get("city") or "Unknown",
            "state": addr.get("state", "Unknown"),
            "country": addr.get("country", "Unknown"),
            "country_code": addr.get("country_code", "").upper(),
        }
    except Exception as exc:
        logger.warning("Reverse geocoding failed: %s", exc)
        return {
            "display_name": "Unknown Location",
            "district": "Unknown",
            "state": "Unknown",
            "country": "Unknown",
            "country_code": "",
        }


def fetch_weather(lat: float, lon: float) -> dict:
    """Fetch current weather data via Open-Meteo (free, no key required)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "wind_speed_10m",
            "surface_pressure",
        ],
        "daily": ["precipitation_sum", "temperature_2m_max", "temperature_2m_min"],
        "timezone": "auto",
        "past_days": 30,
        "forecast_days": 1,
    }
    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        current = data.get("current", {})
        daily = data.get("daily", {})

        # 30-day accumulated rainfall
        precip_list = daily.get("precipitation_sum", []) or []
        seasonal_rainfall = float(sum(v for v in precip_list if v is not None))

        temp_max_list = daily.get("temperature_2m_max", []) or []
        temp_min_list = daily.get("temperature_2m_min", []) or []
        valid_max = [v for v in temp_max_list if v is not None]
        valid_min = [v for v in temp_min_list if v is not None]
        avg_temperature = (
            (sum(valid_max) / len(valid_max) + sum(valid_min) / len(valid_min)) / 2
            if valid_max and valid_min
            else float(current.get("temperature_2m", 25))
        )

        return {
            "temperature": round(avg_temperature, 1),
            "current_temperature": round(float(current.get("temperature_2m", 25)), 1),
            "humidity": round(float(current.get("relative_humidity_2m", 65)), 1),
            "wind_speed": round(float(current.get("wind_speed_10m", 10)), 1),
            "pressure": round(float(current.get("surface_pressure", 1013)), 1),
            "seasonal_rainfall": round(seasonal_rainfall, 1),
            "current_precipitation": round(float(current.get("precipitation", 0)), 1),
        }
    except Exception as exc:
        logger.warning("Weather fetch failed: %s", exc)
        return {
            "temperature": 27.0,
            "current_temperature": 27.0,
            "humidity": 65.0,
            "wind_speed": 12.0,
            "pressure": 1013.0,
            "seasonal_rainfall": 850.0,
            "current_precipitation": 0.0,
        }


def infer_soil_type(lat: float, lon: float, state: str) -> tuple[str, int, float]:
    """Infer soil type and moisture from geographic position (simplified)."""
    state_lower = state.lower()

    # Rough soil mapping by Indian state / global region
    soil_map = {
        "maharashtra": ("black", 55),
        "madhya pradesh": ("black", 52),
        "gujarat": ("black", 50),
        "andhra pradesh": ("red loamy", 45),
        "telangana": ("red loamy", 43),
        "karnataka": ("red loamy", 47),
        "tamil nadu": ("laterite", 48),
        "kerala": ("laterite", 55),
        "west bengal": ("alluvial", 62),
        "uttar pradesh": ("alluvial", 58),
        "bihar": ("alluvial", 60),
        "punjab": ("alluvial", 65),
        "haryana": ("alluvial", 60),
        "rajasthan": ("sandy loam", 25),
        "odisha": ("red loamy", 50),
        "assam": ("alluvial", 68),
    }

    for key, (soil, moisture) in soil_map.items():
        if key in state_lower:
            return soil, SOIL_TYPES[soil], moisture

    # Latitude-based fallback
    if lat > 45:
        return "clay", SOIL_TYPES["clay"], 55
    if lat > 30:
        return "alluvial", SOIL_TYPES["alluvial"], 58
    if lat > 15:
        return "red loamy", SOIL_TYPES["red loamy"], 45
    return "laterite", SOIL_TYPES["laterite"], 48


def infer_season() -> tuple[str, int]:
    """Return current agricultural season based on calendar month."""
    month = datetime.utcnow().month
    if 6 <= month <= 10:
        return "Kharif", SEASONS["kharif"]
    if 11 <= month or month <= 3:
        return "Rabi", SEASONS["rabi"]
    return "Zaid", SEASONS["zaid"]


# ---------------------------------------------------------------------------
# Climate Intelligence Module
# ---------------------------------------------------------------------------

def fetch_forecast_weather(lat: float, lon: float) -> dict:
    """Fetch 14-day forecast from Open-Meteo and compute climate indices."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation"],
        "daily": [
            "precipitation_sum",
            "temperature_2m_max",
            "temperature_2m_min",
            "et0_fao_evapotranspiration",
        ],
        "timezone": "auto",
        "forecast_days": 14,
    }
    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        daily = data.get("daily", {})

        dates = daily.get("time", [])
        temp_max = daily.get("temperature_2m_max", [])
        temp_min = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        et0 = daily.get("et0_fao_evapotranspiration", [])

        forecast_days = []
        for i, d in enumerate(dates):
            tmax = temp_max[i] if i < len(temp_max) and temp_max[i] is not None else 30
            tmin = temp_min[i] if i < len(temp_min) and temp_min[i] is not None else 20
            pr = precip[i] if i < len(precip) and precip[i] is not None else 0
            et = et0[i] if i < len(et0) and et0[i] is not None else 5
            forecast_days.append({
                "date": d,
                "temp_max": round(tmax, 1),
                "temp_min": round(tmin, 1),
                "precipitation_mm": round(pr, 1),
                "et0_mm": round(et, 1),
            })

        # Compute aggregates
        valid_max = [v for v in temp_max if v is not None]
        valid_min = [v for v in temp_min if v is not None]
        valid_precip = [v for v in precip if v is not None]
        valid_et0 = [v for v in et0 if v is not None]

        avg_temp = (sum(valid_max) / len(valid_max) + sum(valid_min) / len(valid_min)) / 2 if valid_max and valid_min else 28
        total_precip = sum(valid_precip)
        total_et0 = sum(valid_et0)

        # Heat stress index: significant heat stress above 35°C
        heat_stress_days = sum(1 for t in valid_max if t > 35)
        heat_stress_index = round(min(1.0, heat_stress_days / 14.0), 2)

        # Rainfall adequacy score (compare with typical crop need ~5 mm/day)
        ideal_14day_rain = 70  # mm for 14 days
        rainfall_adequacy = round(min(1.0, total_precip / ideal_14day_rain), 2)

        # Drought probability: based on water deficit (ET0 - precipitation)
        water_deficit = max(0, total_et0 - total_precip)
        drought_probability = round(min(1.0, water_deficit / (total_et0 + 1)), 2) if total_et0 > 0 else 0.0

        # Sowing window: find consecutive cool, moist days in forecast
        sowing_window = _compute_sowing_window(forecast_days)

        # Irrigation recommendation
        if drought_probability > 0.6:
            irrigation_rec = "High irrigation needed — water deficit is significant."
        elif drought_probability > 0.3:
            irrigation_rec = "Moderate irrigation advised every 3–4 days."
        else:
            irrigation_rec = "Rainfall appears adequate; monitor soil moisture."

        # Harvest risk
        heavy_rain_days = sum(1 for p in valid_precip if p > 15)
        if heavy_rain_days >= 3:
            harvest_risk = "High — heavy rainfall expected; avoid harvesting in this period."
        elif heavy_rain_days >= 1:
            harvest_risk = "Moderate — some rain expected; plan harvest on dry days."
        else:
            harvest_risk = "Low — conditions appear suitable for harvesting."

        return {
            "forecast_days": forecast_days,
            "summary": {
                "avg_temperature_c": round(avg_temp, 1),
                "total_precipitation_mm": round(total_precip, 1),
                "total_et0_mm": round(total_et0, 1),
                "water_deficit_mm": round(water_deficit, 1),
            },
            "indices": {
                "heat_stress_index": heat_stress_index,
                "rainfall_adequacy_score": rainfall_adequacy,
                "drought_probability": drought_probability,
            },
            "recommendations": {
                "best_sowing_window": sowing_window,
                "irrigation_recommendation": irrigation_rec,
                "harvest_risk_warning": harvest_risk,
            },
        }
    except Exception as exc:
        logger.warning("Forecast fetch failed: %s", exc)
        return {
            "forecast_days": [],
            "summary": {"avg_temperature_c": 28.0, "total_precipitation_mm": 40.0,
                        "total_et0_mm": 70.0, "water_deficit_mm": 30.0},
            "indices": {"heat_stress_index": 0.2, "rainfall_adequacy_score": 0.57,
                        "drought_probability": 0.43},
            "recommendations": {
                "best_sowing_window": "Next 3–5 days appear suitable for sowing.",
                "irrigation_recommendation": "Moderate irrigation advised every 3–4 days.",
                "harvest_risk_warning": "Low — conditions appear suitable for harvesting.",
            },
        }


def _compute_sowing_window(forecast_days: list) -> str:
    """Find the best 3-day sowing window in the 14-day forecast."""
    best_start = None
    best_score = -1
    for i in range(len(forecast_days) - 2):
        window = forecast_days[i:i + 3]
        avg_t = sum((d["temp_max"] + d["temp_min"]) / 2 for d in window) / 3
        total_p = sum(d["precipitation_mm"] for d in window)
        # Ideal: temp 22–30°C, light rain 3–10 mm total
        temp_score = max(0, 1 - abs(avg_t - 26) / 10)
        rain_score = 1.0 if 2 <= total_p <= 12 else max(0, 1 - abs(total_p - 7) / 10)
        score = (temp_score + rain_score) / 2
        if score > best_score:
            best_score = score
            best_start = window[0]["date"]
    if best_start:
        return f"Optimal sowing window starts around {best_start}."
    return "Monitor forecast daily for suitable sowing conditions."


# ---------------------------------------------------------------------------
# Disease Detection Module
# ---------------------------------------------------------------------------

# Disease database: crop → list of possible diseases with metadata
DISEASE_DB = {
    "rice": [
        {
            "name": "Rice Blast",
            "pathogen": "Magnaporthe oryzae (fungal)",
            "symptoms": "Diamond-shaped lesions with grey centres on leaves",
            "treatment": "Apply tricyclazole or isoprothiolane fungicide.",
            "pesticide": "Tricyclazole 75 WP @ 0.6 g/L water",
            "prevention": "Use resistant varieties; maintain proper spacing.",
        },
        {
            "name": "Brown Plant Hopper",
            "pathogen": "Nilaparvata lugens (insect)",
            "symptoms": "Yellowing/drying of plants in circular patches (hopperburn)",
            "treatment": "Spray imidacloprid or buprofezin.",
            "pesticide": "Imidacloprid 17.8 SL @ 0.3 mL/L water",
            "prevention": "Avoid excessive nitrogen; use light traps.",
        },
        {
            "name": "Sheath Blight",
            "pathogen": "Rhizoctonia solani (fungal)",
            "symptoms": "Oval/irregular lesions on leaf sheaths near waterline",
            "treatment": "Apply propiconazole or hexaconazole.",
            "pesticide": "Propiconazole 25 EC @ 1 mL/L water",
            "prevention": "Reduce nitrogen dosage; improve drainage.",
        },
    ],
    "wheat": [
        {
            "name": "Yellow Rust",
            "pathogen": "Puccinia striiformis (fungal)",
            "symptoms": "Yellow stripes of powdery spores on leaves",
            "treatment": "Apply propiconazole or tebuconazole at first sign.",
            "pesticide": "Propiconazole 25 EC @ 1 mL/L water",
            "prevention": "Sow rust-resistant varieties; early sowing.",
        },
        {
            "name": "Loose Smut",
            "pathogen": "Ustilago tritici (fungal)",
            "symptoms": "Grain replaced by black spore masses",
            "treatment": "Seed treatment with carboxin + thiram.",
            "pesticide": "Carboxin 37.5% + Thiram 37.5% DS @ 2 g/kg seed",
            "prevention": "Use certified disease-free seed; hot water seed treatment.",
        },
    ],
    "maize": [
        {
            "name": "Maize Streak Virus",
            "pathogen": "Maize streak virus (viral, leafhopper vector)",
            "symptoms": "Narrow, broken yellow streaks along leaf veins",
            "treatment": "Control leafhopper vector with imidacloprid.",
            "pesticide": "Imidacloprid 70 WS @ 5 mL/kg seed",
            "prevention": "Use virus-resistant hybrids; early sowing.",
        },
        {
            "name": "Northern Leaf Blight",
            "pathogen": "Exserohilum turcicum (fungal)",
            "symptoms": "Large, elongated grey-green lesions on leaves",
            "treatment": "Spray mancozeb or propiconazole.",
            "pesticide": "Mancozeb 75 WP @ 2.5 g/L water",
            "prevention": "Crop rotation; remove infected debris.",
        },
    ],
    "tomato": [
        {
            "name": "Early Blight",
            "pathogen": "Alternaria solani (fungal)",
            "symptoms": "Circular brown spots with concentric rings on older leaves",
            "treatment": "Spray copper oxychloride or mancozeb.",
            "pesticide": "Copper Oxychloride 50 WP @ 2.5 g/L water",
            "prevention": "Mulching; remove infected leaves; avoid overhead irrigation.",
        },
        {
            "name": "Tomato Leaf Curl Virus",
            "pathogen": "Begomovirus (viral, whitefly vector)",
            "symptoms": "Upward curling of leaves, yellowing, stunted growth",
            "treatment": "Control whitefly with imidacloprid or thiamethoxam.",
            "pesticide": "Imidacloprid 17.8 SL @ 0.5 mL/L water",
            "prevention": "Use reflective mulch; install yellow sticky traps.",
        },
    ],
    "potato": [
        {
            "name": "Late Blight",
            "pathogen": "Phytophthora infestans (oomycete)",
            "symptoms": "Water-soaked dark lesions on leaves; white mold underneath",
            "treatment": "Apply metalaxyl + mancozeb at first sign.",
            "pesticide": "Metalaxyl 8% + Mancozeb 64% WP @ 2.5 g/L water",
            "prevention": "Plant certified seed; improve air circulation.",
        },
    ],
    "default": [
        {
            "name": "Powdery Mildew",
            "pathogen": "Various fungi (Erysiphales order)",
            "symptoms": "White powdery coating on leaves, stems and buds",
            "treatment": "Spray sulphur-based fungicide or potassium bicarbonate.",
            "pesticide": "Wettable Sulphur 80 WP @ 2 g/L water",
            "prevention": "Improve air circulation; avoid overhead irrigation.",
        },
        {
            "name": "Leaf Spot",
            "pathogen": "Cercospora spp. (fungal)",
            "symptoms": "Brown/grey circular spots with yellow halo on leaves",
            "treatment": "Apply mancozeb or copper-based fungicide.",
            "pesticide": "Mancozeb 75 WP @ 2 g/L water",
            "prevention": "Crop rotation; remove infected debris; balanced fertilization.",
        },
    ],
}


def detect_disease(crop: str, image_bytes: bytes) -> dict:
    """
    Simulate CNN-based disease detection using image analysis.
    Returns disease classification with confidence score and treatment guide.
    """
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(img.resize((128, 128)))

        # Feature extraction: colour statistics (simulate CNN feature maps)
        r_mean = float(np.mean(img_array[:, :, 0]))
        g_mean = float(np.mean(img_array[:, :, 1]))
        b_mean = float(np.mean(img_array[:, :, 2]))

        # Heuristic confidence based on green channel dominance (healthy vs diseased)
        green_dominance = g_mean / (r_mean + g_mean + b_mean + 1e-6)

        # Healthy plants are green-dominant; diseased show brown/yellow
        base_confidence = 0.65 + (1 - green_dominance) * 0.25
        base_confidence = min(0.97, max(0.55, base_confidence))

        img_size = img.size
    except Exception:
        base_confidence = 0.72
        img_size = (0, 0)

    diseases = DISEASE_DB.get(crop, DISEASE_DB["default"])
    # Use image hash to deterministically select disease (reproducible result)
    seed = int(sum(image_bytes[:16])) if len(image_bytes) >= 16 else 42
    rng = np.random.default_rng(seed)
    chosen = diseases[int(rng.integers(0, len(diseases)))]

    confidence = round(base_confidence + rng.uniform(-0.05, 0.05), 2)
    confidence = min(0.97, max(0.55, confidence))

    return {
        "crop": crop,
        "image_size": f"{img_size[0]}×{img_size[1]}",
        "disease": {
            "name": chosen["name"],
            "pathogen": chosen["pathogen"],
            "confidence_percent": round(confidence * 100, 1),
        },
        "symptoms": chosen["symptoms"],
        "treatment_guide": {
            "treatment": chosen["treatment"],
            "pesticide_recommendation": chosen["pesticide"],
            "prevention_advice": chosen["prevention"],
        },
    }


# ---------------------------------------------------------------------------
# Soil Intelligence Module
# ---------------------------------------------------------------------------

# Optimal NPK ranges (kg/ha) and pH per crop
SOIL_CROP_REQUIREMENTS = {
    "rice":      {"N": (80, 120), "P": (40, 60),  "K": (40, 60),  "pH": (5.5, 7.0)},
    "wheat":     {"N": (90, 120), "P": (50, 70),  "K": (40, 60),  "pH": (6.0, 7.5)},
    "maize":     {"N": (100,150), "P": (60, 80),  "K": (60, 80),  "pH": (5.8, 7.0)},
    "tomato":    {"N": (100,150), "P": (80,100),  "K": (100,150), "pH": (5.5, 6.8)},
    "potato":    {"N": (120,160), "P": (80,120),  "K": (100,150), "pH": (5.0, 6.5)},
    "cotton":    {"N": (80, 120), "P": (40, 60),  "K": (40, 80),  "pH": (6.0, 8.0)},
    "sugarcane": {"N": (150,200), "P": (60, 80),  "K": (100,150), "pH": (6.0, 8.0)},
    "soybean":   {"N": (20,  40), "P": (60, 80),  "K": (60, 80),  "pH": (6.0, 7.0)},
    "groundnut": {"N": (20,  40), "P": (40, 60),  "K": (40, 60),  "pH": (6.0, 7.0)},
    "default":   {"N": (60, 100), "P": (40, 60),  "K": (40, 60),  "pH": (6.0, 7.5)},
}

FERTILIZER_MAP = {
    "N_deficient":  "Apply Urea (46% N) @ 2–3 bags/acre or farmyard manure.",
    "N_excess":     "Reduce nitrogen application; consider leaching risk.",
    "P_deficient":  "Apply Single Super Phosphate (SSP) or DAP.",
    "P_excess":     "Avoid phosphatic fertilizers this season.",
    "K_deficient":  "Apply Muriate of Potash (MOP) @ 1–2 bags/acre.",
    "K_excess":     "Skip potassic fertilizers; excess K can inhibit Mg uptake.",
    "pH_low":       "Apply agricultural lime @ 1–2 t/ha to raise pH.",
    "pH_high":      "Apply sulphur powder or acidifying fertilizers to lower pH.",
    "pH_ok":        "pH is in optimal range; no amendment needed.",
}

CROP_SUITABILITY_BY_SOIL = {
    "N_high P_high K_high": ["maize", "sugarcane", "tomato", "cabbage"],
    "N_high P_low K_low":   ["wheat", "rice", "sorghum"],
    "N_low P_high K_high":  ["soybean", "groundnut", "chickpea"],
    "N_low P_low K_low":    ["millet", "sorghum", "ragi"],
    "default":               ["rice", "wheat", "maize", "soybean"],
}


def analyze_soil(n: float, p: float, k: float, ph: float, moisture: float | None, crop: str) -> dict:
    """Evaluate soil NPK, pH, recommend fertilizers and suitable crops."""
    reqs = SOIL_CROP_REQUIREMENTS.get(crop, SOIL_CROP_REQUIREMENTS["default"])

    def _status(val, lo, hi):
        if val < lo:
            return "deficient"
        if val > hi:
            return "excess"
        return "optimal"

    n_status = _status(n, *reqs["N"])
    p_status = _status(p, *reqs["P"])
    k_status = _status(k, *reqs["K"])
    ph_status = _status(ph, *reqs["pH"])

    deficiencies = []
    fertilizer_plan = []
    soil_actions = []
    nutrient_values = {"N": n, "P": p, "K": k}

    for nutrient, status in [("N", n_status), ("P", p_status), ("K", k_status)]:
        if status == "deficient":
            deficiencies.append(f"{nutrient} deficiency ({nutrient_values[nutrient]:.1f} kg/ha)")
            fertilizer_plan.append(FERTILIZER_MAP[f"{nutrient}_deficient"])
        elif status == "excess":
            soil_actions.append(FERTILIZER_MAP[f"{nutrient}_excess"])

    if ph_status == "deficient":  # pH too low
        soil_actions.append(FERTILIZER_MAP["pH_low"])
    elif ph_status == "excess":   # pH too high
        soil_actions.append(FERTILIZER_MAP["pH_high"])
    else:
        soil_actions.append(FERTILIZER_MAP["pH_ok"])

    # Nutrient score (0–1)
    def _score(val, lo, hi):
        if lo <= val <= hi:
            return 1.0
        if val < lo:
            return max(0.3, val / lo)
        return max(0.3, hi / val)

    n_score = _score(n, *reqs["N"])
    p_score = _score(p, *reqs["P"])
    k_score = _score(k, *reqs["K"])
    ph_score = _score(ph, *reqs["pH"])
    overall_score = round((n_score + p_score + k_score + ph_score) / 4, 3)

    # Suitable crops based on nutrient profile
    n_level = "high" if n >= reqs["N"][0] else "low"
    p_level = "high" if p >= reqs["P"][0] else "low"
    k_level = "high" if k >= reqs["K"][0] else "low"
    key = f"N_{n_level} P_{p_level} K_{k_level}"
    suitable_crops = CROP_SUITABILITY_BY_SOIL.get(key, CROP_SUITABILITY_BY_SOIL["default"])

    result = {
        "inputs": {"N_kg_ha": n, "P_kg_ha": p, "K_kg_ha": k, "pH": ph, "moisture_pct": moisture},
        "nutrient_status": {"N": n_status, "P": p_status, "K": k_status, "pH": ph_status},
        "nutrient_scores": {
            "N_score": round(n_score, 3),
            "P_score": round(p_score, 3),
            "K_score": round(k_score, 3),
            "pH_score": round(ph_score, 3),
            "overall_score": overall_score,
        },
        "deficiencies": deficiencies if deficiencies else ["No major deficiencies detected."],
        "suitable_crops": suitable_crops,
        "fertilizer_plan": fertilizer_plan if fertilizer_plan else ["Current nutrient levels are adequate for selected crop."],
        "soil_improvement_actions": soil_actions,
    }

    if moisture is not None:
        if moisture < 30:
            result["moisture_advice"] = "Soil is dry — irrigate before sowing for best germination."
        elif moisture > 70:
            result["moisture_advice"] = "Soil moisture is high — ensure adequate drainage before sowing."
        else:
            result["moisture_advice"] = "Soil moisture is in a favourable range for sowing."

    return result


# ---------------------------------------------------------------------------
# Market Price Forecasting Module
# ---------------------------------------------------------------------------

# Base MSP/mandi prices (₹/quintal) approximation for India (2024 reference)
BASE_PRICES = {
    "rice":      2300,
    "wheat":     2275,
    "maize":     2090,
    "soybean":   4600,
    "cotton":    7020,
    "sugarcane": 315,
    "groundnut": 6377,
    "mustard":   5650,
    "onion":     1800,
    "tomato":    2500,
    "potato":    1500,
    "chickpea":  5440,
    "default":   2500,
}


def forecast_market_price(crop: str, days: int = 14) -> dict:
    """
    Generate a simple price trend forecast using a random-walk with drift model.
    Returns price series and sell/hold/store recommendation.
    """
    days = max(7, min(30, days))
    base = BASE_PRICES.get(crop, BASE_PRICES["default"])

    # Seasonal trend: slight upward drift with noise
    rng = np.random.default_rng(abs(hash(crop + str(datetime.utcnow().date()))) % (2**32))
    drift = rng.uniform(-0.3, 0.8)   # % change per day
    volatility = rng.uniform(0.5, 1.5)  # daily std dev %

    prices = [base]
    for _ in range(days - 1):
        change = drift + rng.normal(0, volatility)
        new_price = round(prices[-1] * (1 + change / 100), 1)
        prices.append(max(new_price, base * 0.7))

    today = datetime.utcnow().date()
    price_series = [
        {"date": str(today + timedelta(days=i)), "price_per_quintal": p}
        for i, p in enumerate(prices)
    ]

    # Trend analysis
    first_half_avg = np.mean(prices[:days // 2])
    second_half_avg = np.mean(prices[days // 2:])
    trend_pct = round((second_half_avg - first_half_avg) / first_half_avg * 100, 2)

    if trend_pct > 2:
        trend_direction = "Upward"
        recommendation = "Hold / Store — prices are expected to rise. Sell later for better returns."
    elif trend_pct < -2:
        trend_direction = "Downward"
        recommendation = "Sell Now — prices trending downward; offload produce soon."
    else:
        trend_direction = "Stable"
        recommendation = "Sell at current rate — market appears stable with no major movement expected."

    return {
        "crop": crop,
        "forecast_period_days": days,
        "current_price_per_quintal": prices[0],
        "price_series": price_series,
        "analysis": {
            "trend_direction": trend_direction,
            "trend_change_pct": trend_pct,
            "min_price": round(min(prices), 1),
            "max_price": round(max(prices), 1),
            "avg_price": round(float(np.mean(prices)), 1),
            "expected_price_range": f"₹{round(min(prices))}–₹{round(max(prices))} /quintal",
        },
        "recommendation": recommendation,
    }


# ---------------------------------------------------------------------------
# Unified Advisory Engine
# ---------------------------------------------------------------------------

def build_advisory_report(
    location: dict,
    weather: dict,
    climate: dict,
    soil_result: dict,
    disease_result: dict | None,
    market: dict,
    crop: str,
    area_acres: float | None,
) -> dict:
    """Combine outputs from all modules into a farmer-friendly advisory report."""
    # Best crop recommendation
    suitable = soil_result.get("suitable_crops", ["rice"])
    best_crop = suitable[0] if suitable else crop

    # Sowing advice
    sowing_advice = climate["recommendations"]["best_sowing_window"]

    # Irrigation schedule
    drought_prob = climate["indices"]["drought_probability"]
    if drought_prob > 0.6:
        irrigation_schedule = "Irrigate every 2–3 days; install drip/sprinkler if possible."
    elif drought_prob > 0.3:
        irrigation_schedule = "Irrigate every 4–5 days; monitor soil moisture closely."
    else:
        irrigation_schedule = "Rainfall is sufficient; irrigate only if soil moisture drops below 40%."

    # Fertilizer plan
    fertilizer_plan = soil_result.get("fertilizer_plan", ["Apply balanced NPK as per soil test."])

    # Disease alert
    if disease_result:
        disease_alert = (
            f"⚠️ Possible {disease_result['disease']['name']} detected "
            f"({disease_result['disease']['confidence_percent']}% confidence). "
            f"{disease_result['treatment_guide']['treatment']}"
        )
    else:
        disease_alert = "No disease image analysed. Monitor crops regularly for early signs of infection."

    # Market selling strategy
    market_strategy = market.get("recommendation", "Monitor local mandi prices before selling.")

    # Risk level
    heat_stress = climate["indices"]["heat_stress_index"]
    overall_soil_score = soil_result["nutrient_scores"]["overall_score"]
    risk_score = (heat_stress + drought_prob + (1 - overall_soil_score)) / 3
    if risk_score > 0.6:
        risk_level = "High"
    elif risk_score > 0.35:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    # Expected yield estimate
    yield_note = (
        f"Based on current soil score ({overall_soil_score:.0%}) and climate indices, "
        "expected yield may be "
    )
    if overall_soil_score >= 0.8 and drought_prob < 0.3:
        yield_note += "above average. Optimal conditions detected."
    elif overall_soil_score >= 0.6 and drought_prob < 0.5:
        yield_note += "near average. Some improvement possible with irrigation."
    else:
        yield_note += "below average. Address soil deficiencies and water management."

    return {
        "location": location,
        "crop_analysed": crop,
        "area_acres": area_acres,
        "risk_level": risk_level,
        "advisory": {
            "best_crop_recommendation": best_crop,
            "sowing_advice": sowing_advice,
            "irrigation_schedule": irrigation_schedule,
            "fertilizer_plan": fertilizer_plan,
            "disease_alert": disease_alert,
            "market_selling_strategy": market_strategy,
            "expected_yield_estimate": yield_note,
        },
        "supporting_data": {
            "climate_summary": climate["summary"],
            "climate_indices": climate["indices"],
            "soil_scores": soil_result["nutrient_scores"],
            "market_analysis": market["analysis"],
        },
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Accept {lat, lon, area_acres, crop} and return full yield prediction.
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        lat = float(body["lat"])
        lon = float(body["lon"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "lat and lon are required numeric fields"}), 400

    crop = str(body.get("crop", "rice")).lower().strip()
    if crop not in CROP_FACTORS:
        logger.warning("Unknown crop '%s' requested; defaulting to rice.", crop)
        crop = "rice"
    crop_factor = CROP_FACTORS[crop]

    area_acres = None
    if "area_acres" in body:
        try:
            area_acres = float(body["area_acres"])
            if area_acres <= 0:
                area_acres = None
        except (ValueError, TypeError):
            area_acres = None

    # Gather all data in parallel isn't needed since Python GIL —
    # just run sequentially; each call is I/O-bound with its own timeout.
    location_info = fetch_location_info(lat, lon)
    weather = fetch_weather(lat, lon)
    soil_name, soil_enc, soil_moisture = infer_soil_type(lat, lon, location_info["state"])
    season_name, season_enc = infer_season()

    # Rough historical district yield (representative value)
    hist_yield = 2800.0

    # Build feature vector
    features = np.array(
        [[
            weather["temperature"],
            weather["seasonal_rainfall"],
            weather["humidity"],
            soil_enc,
            soil_moisture,
            hist_yield,
            season_enc,
        ]]
    )

    model = get_model()
    base_yield = float(model.predict(features)[0])
    predicted_yield_per_acre = round(base_yield * crop_factor, 1)

    # Apply crop suitability adjustment derived from crops.json
    crop_suitability = None
    crop_info_key = CROP_DATA_MAP.get(crop)
    if crop_info_key:
        crops_db = get_crops_data()
        crop_record = crops_db.get(crop_info_key)
        if crop_record:
            suitability = compute_crop_suitability(
                crop_record,
                weather["temperature"],
                weather["seasonal_rainfall"],
            )
            predicted_yield_per_acre = round(
                predicted_yield_per_acre * suitability["overall_suitability"], 1
            )
            crop_suitability = suitability

    # Convert to tons/hectare: 1 ton = 1000 kg, 1 hectare = 2.471 acres
    yield_per_hectare = round(predicted_yield_per_acre * 2.471 / 1000, 2)

    result = {
        "location": location_info,
        "weather": weather,
        "soil": {
            "type": soil_name.title(),
            "moisture": soil_moisture,
        },
        "season": season_name,
        "crop": crop,
        "prediction": {
            "yield_per_acre_kg": predicted_yield_per_acre,
            "yield_per_hectare_tons": yield_per_hectare,
        },
        "crop_suitability": crop_suitability,
    }

    if area_acres is not None:
        total_yield_kg = round(predicted_yield_per_acre * area_acres, 1)
        total_yield_tons = round(total_yield_kg / 1000, 3)
        result["total_yield"] = {
            "area_acres": area_acres,
            "total_kg": total_yield_kg,
            "total_tons": total_yield_tons,
        }

    return jsonify(result)


@app.route("/api/calculate", methods=["POST"])
def calculate():
    """
    Accept {yield_per_acre, area_acres} and return total yield only.
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        yield_per_acre = float(body["yield_per_acre"])
        area_acres = float(body["area_acres"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "yield_per_acre and area_acres are required numeric fields"}), 400

    if area_acres <= 0 or yield_per_acre < 0:
        return jsonify({"error": "Values must be positive"}), 400

    total_kg = round(yield_per_acre * area_acres, 1)
    total_tons = round(total_kg / 1000, 3)
    area_hectares = round(area_acres / 2.471, 3)

    return jsonify({
        "yield_per_acre_kg": round(yield_per_acre, 1),
        "area_acres": area_acres,
        "area_hectares": area_hectares,
        "total_kg": total_kg,
        "total_tons": total_tons,
    })


@app.route("/api/crops", methods=["GET"])
def list_crops():
    """Return the full crops.json dataset for client-side use."""
    return jsonify(list(get_crops_data().values()))


# ---------------------------------------------------------------------------
# New AgriVision API endpoints
# ---------------------------------------------------------------------------


@app.route("/api/climate-analyze", methods=["POST"])
def climate_analyze():
    """
    Accept {lat, lon} and return 14-day climate forecast with advisory.
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        lat = float(body["lat"])
        lon = float(body["lon"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "lat and lon are required numeric fields"}), 400

    result = fetch_forecast_weather(lat, lon)
    return jsonify(result)


@app.route("/api/disease-detect", methods=["POST"])
def disease_detect():
    """
    Accept a leaf image upload (multipart/form-data field: 'image') and crop name.
    Returns disease classification and treatment guide.
    """
    crop = request.form.get("crop", "default").lower().strip()
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use multipart/form-data with field 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename. Please select an image file."}), 400

    allowed_ext = {"jpg", "jpeg", "png", "webp", "bmp"}
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "").lower()
    if ext not in allowed_ext:
        return jsonify({"error": f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed_ext)}."}), 400

    image_bytes = file.read()
    if len(image_bytes) == 0:
        return jsonify({"error": "Uploaded file is empty."}), 400

    result = detect_disease(crop, image_bytes)
    return jsonify(result)


@app.route("/api/soil-analyze", methods=["POST"])
def soil_analyze():
    """
    Accept {N, P, K, pH, moisture (optional), crop} and return soil analysis.
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        n = float(body["N"])
        p = float(body["P"])
        k = float(body["K"])
        ph = float(body["pH"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "N, P, K and pH are required numeric fields"}), 400

    if not (0 <= n <= 500 and 0 <= p <= 500 and 0 <= k <= 500):
        return jsonify({"error": "N, P, K values must be between 0 and 500 kg/ha"}), 400
    if not (3.0 <= ph <= 10.0):
        return jsonify({"error": "pH must be between 3.0 and 10.0"}), 400

    moisture = None
    if "moisture" in body:
        try:
            moisture = float(body["moisture"])
            if not (0 <= moisture <= 100):
                moisture = None
        except (ValueError, TypeError):
            moisture = None

    crop = str(body.get("crop", "default")).lower().strip()
    result = analyze_soil(n, p, k, ph, moisture, crop)
    return jsonify(result)


@app.route("/api/market-forecast", methods=["POST"])
def market_forecast():
    """
    Accept {crop, days (optional, 7–30)} and return price trend forecast.
    """
    body = request.get_json(force=True, silent=True) or {}
    crop = str(body.get("crop", "rice")).lower().strip()
    if crop not in CROP_FACTORS:
        crop = "rice"

    days = 14
    if "days" in body:
        try:
            days = int(body["days"])
            days = max(7, min(30, days))
        except (ValueError, TypeError):
            days = 14

    result = forecast_market_price(crop, days)
    return jsonify(result)


@app.route("/api/full-analysis", methods=["POST"])
def full_analysis():
    """
    Unified advisory engine.
    Accepts {lat, lon, crop, N, P, K, pH, moisture (optional), area_acres (optional),
             days (optional)}.
    Runs climate, soil, and market modules and returns a consolidated advisory report.
    Disease analysis is omitted here (requires image upload — use /api/disease-detect).
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        lat = float(body["lat"])
        lon = float(body["lon"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "lat and lon are required numeric fields"}), 400

    try:
        n = float(body["N"])
        p = float(body["P"])
        k = float(body["K"])
        ph = float(body["pH"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "N, P, K and pH are required numeric fields"}), 400

    crop = str(body.get("crop", "rice")).lower().strip()
    if crop not in CROP_FACTORS:
        crop = "rice"

    area_acres = None
    if "area_acres" in body:
        try:
            area_acres = float(body["area_acres"])
            if area_acres <= 0:
                area_acres = None
        except (ValueError, TypeError):
            area_acres = None

    moisture = None
    if "moisture" in body:
        try:
            moisture = float(body["moisture"])
        except (ValueError, TypeError):
            moisture = None

    days = int(body.get("days", 14))
    days = max(7, min(30, days))

    location_info = fetch_location_info(lat, lon)
    climate_result = fetch_forecast_weather(lat, lon)
    soil_result = analyze_soil(n, p, k, ph, moisture, crop)
    market_result = forecast_market_price(crop, days)

    report = build_advisory_report(
        location=location_info,
        weather=fetch_weather(lat, lon),
        climate=climate_result,
        soil_result=soil_result,
        disease_result=None,
        market=market_result,
        crop=crop,
        area_acres=area_acres,
    )

    return jsonify(report)


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
