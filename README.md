# 🌾 Harvest – Smart Area-Based Crop Yield Prediction System

A Flask-powered web application that predicts crop yields using real-time weather data, geographic location, soil analysis, and a machine-learning model trained on agricultural data.

---

## Features

- **Real-time weather integration** – fetches temperature, humidity, rainfall, wind speed, and pressure via the [Open-Meteo](https://open-meteo.com/) API (no API key required).
- **Reverse geocoding** – converts GPS coordinates to district/state/country information via [Nominatim](https://nominatim.openstreetmap.org/).
- **ML-powered yield prediction** – a Random Forest Regressor trained on synthetic historical data predicts base yield, which is then scaled by crop-specific factors.
- **Crop suitability analysis** – evaluates how well current weather conditions match a crop's ideal temperature range and water requirements.
- **Soil type inference** – automatically infers soil type and moisture based on state/region.
- **Seasonal awareness** – detects the current agricultural season (Kharif / Rabi / Zaid) from the calendar month.
- **50+ supported crops** – including food grains, pulses, oilseeds, cash crops, plantation crops, spices, fruits, vegetables, and floriculture.

---

## Supported Crops

| Category | Crops |
|---|---|
| Food Grains | Rice, Wheat, Maize, Ragi, Cumbu, Thinai, Kodo Millet, Little Millet, Barley, Sorghum |
| Pulses | Black Gram, Green Gram, Red Gram, Horse Gram, Chickpea |
| Oilseeds | Groundnut, Sesame, Coconut, Castor, Sunflower, Soybean, Mustard |
| Cash Crops | Sugarcane, Cotton, Tobacco |
| Plantation | Coffee, Tea, Rubber |
| Spices | Turmeric, Chilli, Coriander, Pepper, Cardamom |
| Fruits | Banana, Mango, Sapota, Guava, Papaya, Jackfruit |
| Vegetables | Tomato, Brinjal, Onion, Drumstick, Bhindi, Tapioca, Potato, Cabbage |
| Floriculture | Jasmine, Rose, Marigold, Tuberose |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, Flask 3.0 |
| ML | scikit-learn (Random Forest), NumPy |
| Weather API | Open-Meteo (free, no key) |
| Geocoding | Nominatim / OpenStreetMap |
| Server | Gunicorn |
| Frontend | HTML / CSS / JavaScript |

---

## Prerequisites

- Python 3.12 or higher
- `pip`

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/sachin712122/harvest.git
cd harvest

# 2. (Optional) Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Running the Application

### Development server

```bash
python app.py
```

The app starts on **http://localhost:5000** by default.

### Production server (Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## API Reference

### `POST /api/analyze`

Full yield prediction for a given location, crop, and area.

**Request body (JSON)**

| Field | Type | Required | Description |
|---|---|---|---|
| `lat` | float | ✅ | Latitude of the farm |
| `lon` | float | ✅ | Longitude of the farm |
| `crop` | string | ❌ | Crop name (default: `rice`) |
| `area_acres` | float | ❌ | Farm area in acres |

**Example request**

```json
{
  "lat": 13.0827,
  "lon": 80.2707,
  "crop": "rice",
  "area_acres": 5
}
```

**Example response**

```json
{
  "location": { "district": "Chennai", "state": "Tamil Nadu", "country": "India" },
  "weather": { "temperature": 29.5, "humidity": 72.0, "seasonal_rainfall": 420.3 },
  "soil": { "type": "Laterite", "moisture": 48 },
  "season": "Rabi",
  "crop": "rice",
  "prediction": {
    "yield_per_acre_kg": 2150.5,
    "yield_per_hectare_tons": 5.31
  },
  "total_yield": {
    "area_acres": 5,
    "total_kg": 10752.5,
    "total_tons": 10.753
  },
  "crop_suitability": {
    "temperature_score": 0.92,
    "rainfall_score": 0.78,
    "overall_suitability": 0.85
  }
}
```

---

### `POST /api/calculate`

Simple total-yield calculator given a known yield rate and area.

**Request body (JSON)**

| Field | Type | Required | Description |
|---|---|---|---|
| `yield_per_acre` | float | ✅ | Yield in kg per acre |
| `area_acres` | float | ✅ | Farm area in acres |

**Example request**

```json
{
  "yield_per_acre": 2000,
  "area_acres": 3.5
}
```

**Example response**

```json
{
  "yield_per_acre_kg": 2000.0,
  "area_acres": 3.5,
  "area_hectares": 1.417,
  "total_kg": 7000.0,
  "total_tons": 7.0
}
```

---

### `GET /api/crops`

Returns the full crop database (ideal temperature range, water requirements, soil types, etc.) as a JSON array.

---

## Project Structure

```
harvest/
├── app.py               # Flask application & ML logic
├── requirements.txt     # Python dependencies
├── static/
│   ├── css/             # Stylesheets
│   ├── js/
│   │   └── main.js      # Frontend JavaScript
│   └── data/
│       └── crops.json   # Crop database (temp, water, soil requirements)
└── templates/
    └── index.html       # Main web interface
```

---

## License

This project is open-source. Feel free to use and adapt it for agricultural research and education.
