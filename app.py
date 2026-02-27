"""
Smart Area-Based Crop Yield Prediction System
Flask backend server
"""

import os
import json
import pickle
import logging
import threading

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

# ---------------------------------------------------------------------------
# ML model: build / load
# ---------------------------------------------------------------------------

MODEL_PATH = os.path.join(os.path.dirname(__file__), "yield_model.pkl")
_model = None
_model_lock = threading.Lock()

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
    from datetime import datetime

    month = datetime.utcnow().month
    if 6 <= month <= 10:
        return "Kharif", SEASONS["kharif"]
    if 11 <= month or month <= 3:
        return "Rabi", SEASONS["rabi"]
    return "Zaid", SEASONS["zaid"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Accept {lat, lon, area_acres} and return full yield prediction.
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        lat = float(body["lat"])
        lon = float(body["lon"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "lat and lon are required numeric fields"}), 400

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
    predicted_yield_per_acre = float(model.predict(features)[0])
    predicted_yield_per_acre = round(predicted_yield_per_acre, 1)

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
        "prediction": {
            "yield_per_acre_kg": predicted_yield_per_acre,
            "yield_per_hectare_tons": yield_per_hectare,
        },
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


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
