# 🌾 AgriVision – AI-Powered Agricultural Decision Support Platform

A full-stack, AI-powered web application providing complete farm intelligence in one unified dashboard. It combines real-time weather data, machine-learning yield prediction, climate intelligence, soil analysis, market price forecasting, an AI advisory report, and CNN-based crop disease detection — all from a single page.

---

## Features

| Module | Description |
|---|---|
| **📍 Location & Weather** | Auto-detects GPS location; fetches live temperature, humidity, rainfall, wind speed, and pressure via [Open-Meteo](https://open-meteo.com/) (no API key required). Reverse-geocodes to district/state/country via [Nominatim](https://nominatim.openstreetmap.org/). |
| **🌾 Yield Prediction** | Random Forest Regressor scaled by per-crop yield multipliers and suitability scores from a 50+ crop database. Returns predicted yield per acre and per hectare. |
| **🌿 Crop Suitability** | Scores a crop's fit for current temperature and 30-day rainfall vs its ideal conditions. Displays temperature score, rainfall score, and overall suitability. |
| **🌤️ Climate Intelligence** | 14-day weather forecast with heat-stress index, rainfall adequacy, drought probability, water-deficit calculation, best sowing window, irrigation guidance, and harvest-risk warning. |
| **🪨 Soil Analysis** | Evaluates N/P/K levels and pH against crop-specific requirements. Generates a fertilizer plan, soil improvement actions, and a list of suitable crops. |
| **📈 Market Price Forecast** | Random-walk price model with seasonal drift for 7–30 days. Provides a sell/hold/store recommendation and interactive price chart. |
| **🤖 AI Advisory Report** | Aggregates climate, soil, and market data into a single risk-scored advisory covering sowing advice, irrigation schedule, fertilizer plan, disease alerts, and market strategy. |
| **🔬 Disease Detection** | Upload leaf images for CNN-based disease classification using EfficientNet-B0 trained on PlantVillage (38 classes, ~99.6% accuracy). Falls back to a colour-heuristic when model weights are not present. |
| **🌐 Bilingual UI** | Full English / Tamil (தமிழ்) toggle for all labels, crop names, and advisory text. |
| **📱 PWA / Android** | Progressive Web App with service-worker offline cache. Includes a native Android WebView wrapper with GPS and camera integration. |

---

## How It Works (Workflow)

```
User opens AgriVision in a browser or the Android app
        │
        ▼
1. SELECT CROP  ── Choose from 50+ crops in the dropdown
        │
        ▼
2. DETECT LOCATION  ── Browser Geolocation API (or manual lat/lon)
        │
        ├─► /api/analyze        → Yield prediction + crop suitability
        ├─► /api/climate-analyze → 14-day forecast + climate indices
        └─► /api/market-forecast → Price trend for the selected crop
                │
                ├─► /api/soil-analyze    (parallel: runs soil module)
                └─► /api/full-analysis   (parallel: runs advisory engine)
        │
        ▼
3. DASHBOARD  ── All 7 panels rendered simultaneously:
   • Location & Weather    • Yield Prediction
   • Climate Intelligence  • Soil Analysis
   • Market Forecast       • AI Advisory Report
   • Disease Detection (triggered separately by image upload)
```

---

## Supported Crops (50+)

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
| ML – Yield | scikit-learn (Random Forest), NumPy |
| ML – Disease | PyTorch, EfficientNet-B0 (PlantVillage 38-class) |
| Image Processing | Pillow (PIL) |
| Weather / Climate API | Open-Meteo (free, no API key) |
| Geocoding | Nominatim / OpenStreetMap |
| Production Server | Gunicorn |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES2022) |
| UI Framework | Tailwind CSS (CDN, utility prefix `tw-`) |
| Android App | Kotlin, AndroidX WebView |

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

> **Optional – Disease Detection GPU model**
> To enable the full EfficientNet-B0 disease model, download the PyTorch weights file
> (38-class PlantVillage, state-dict) and save it as `plant_disease_efficientnet_b0.pth`
> in the project root. Without this file the disease module falls back to a colour-heuristic.

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

## Android Mobile App

The repository includes a native Android app (`android/`) that wraps AgriVision in a
full-screen WebView. The Android app provides:

- 📍 **Native GPS** – geolocation permission prompt for farm location detection
- 📷 **Camera integration** – file chooser / camera access for disease photo uploads
- 🔄 **Pull-to-refresh** – swipe down to reload the page
- 🌙 **Dark-mode support** – respects the system dark-mode setting via algorithmic darkening
- 📶 **PWA offline cache** – core assets are cached so the UI loads instantly

### Prerequisites

- [Android Studio](https://developer.android.com/studio) (Hedgehog 2023.1.1 or later)
- Android SDK 34, Build Tools 34.x
- JDK 17

### Building the Android APK

1. **Start the Flask server** on your machine (or deploy it to a public URL):

   ```bash
   python app.py          # listens on http://0.0.0.0:5000
   ```

2. **Configure the server URL** in `android/app/build.gradle`:

   ```groovy
   // For an Android emulator (default – maps to host localhost):
   buildConfigField("String", "SERVER_URL", "\"http://10.0.2.2:5000\"")

   // For a physical device on the same Wi-Fi network, use your machine's IP:
   buildConfigField("String", "SERVER_URL", "\"http://192.168.x.x:5000\"")

   // For a deployed server:
   buildConfigField("String", "SERVER_URL", "\"https://your-agrivision-server.com\"")
   ```

3. **Open the project in Android Studio**:

   ```
   File → Open → select the android/ directory
   ```

4. **Run on an emulator or physical device** via the ▶ Run button, or build a release APK:

   ```bash
   cd android
   ./gradlew assembleRelease
   # APK is at android/app/build/outputs/apk/release/app-release.apk
   ```

### Installing on Android Without Android Studio

If the Flask server is deployed at a public URL, users can install the PWA directly from any
Android browser (Chrome / Edge / Firefox):

1. Open the AgriVision URL in Chrome on Android.
2. Tap the browser menu → **"Add to Home screen"** (or **"Install app"**).
3. The app icon appears on the home screen and opens in standalone (full-screen) mode.

---

## API Reference

All request bodies are JSON unless otherwise noted.

---

### `POST /api/analyze`

Full yield prediction for a given location, crop, and area.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `lat` | float | ✅ | Latitude of the farm |
| `lon` | float | ✅ | Longitude of the farm |
| `crop` | string | ❌ | Crop key (default: `rice`) |
| `area_acres` | float | ❌ | Farm area in acres |

**Example response**

```json
{
  "location": { "district": "Chennai", "state": "Tamil Nadu", "country": "India" },
  "weather": { "temperature": 29.5, "humidity": 72.0, "seasonal_rainfall": 420.3 },
  "soil": { "type": "Laterite", "moisture": 48 },
  "season": "Rabi",
  "crop": "rice",
  "prediction": { "yield_per_acre_kg": 2150.5, "yield_per_hectare_tons": 5.31 },
  "total_yield": { "area_acres": 5, "total_kg": 10752.5, "total_tons": 10.753 },
  "crop_suitability": { "temperature_score": 0.92, "rainfall_score": 0.78, "overall_suitability": 0.85 }
}
```

---

### `POST /api/calculate`

Simple total-yield calculator.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `yield_per_acre` | float | ✅ | Yield in kg per acre |
| `area_acres` | float | ✅ | Farm area in acres |

---

### `POST /api/climate-analyze`

14-day weather forecast with climate indices and farming recommendations.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `lat` | float | ✅ | Latitude |
| `lon` | float | ✅ | Longitude |

**Example response (abbreviated)**

```json
{
  "forecast_days": [{ "date": "2025-06-01", "temp_max": 34.2, "temp_min": 24.1, "precipitation_mm": 2.3, "et0_mm": 6.1 }],
  "summary": { "avg_temperature_c": 29.5, "total_precipitation_mm": 38.2, "water_deficit_mm": 47.8 },
  "indices": { "heat_stress_index": 0.21, "rainfall_adequacy_score": 0.55, "drought_probability": 0.43 },
  "recommendations": {
    "best_sowing_window": "Optimal sowing window starts around 2025-06-03.",
    "irrigation_recommendation": "Moderate irrigation advised every 3–4 days.",
    "harvest_risk_warning": "Low — conditions appear suitable for harvesting."
  }
}
```

---

### `POST /api/soil-analyze`

Evaluates soil NPK and pH; returns fertilizer plan and suitable crops.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `N` | float | ✅ | Nitrogen (kg/ha, 0–500) |
| `P` | float | ✅ | Phosphorus (kg/ha, 0–500) |
| `K` | float | ✅ | Potassium (kg/ha, 0–500) |
| `pH` | float | ✅ | Soil pH (3.0–10.0) |
| `moisture` | float | ❌ | Soil moisture % (0–100) |
| `crop` | string | ❌ | Target crop key (default: `default`) |

---

### `POST /api/market-forecast`

7–30 day market price forecast with trend analysis and recommendation.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `crop` | string | ❌ | Crop key (default: `rice`) |
| `days` | int | ❌ | Forecast period, 7–30 days (default: 14) |

---

### `POST /api/full-analysis`

Unified advisory engine — aggregates climate, soil, and market analysis.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `lat` | float | ✅ | Latitude |
| `lon` | float | ✅ | Longitude |
| `N` | float | ✅ | Nitrogen (kg/ha) |
| `P` | float | ✅ | Phosphorus (kg/ha) |
| `K` | float | ✅ | Potassium (kg/ha) |
| `pH` | float | ✅ | Soil pH |
| `crop` | string | ❌ | Crop key (default: `rice`) |
| `area_acres` | float | ❌ | Farm area in acres |
| `moisture` | float | ❌ | Soil moisture % |
| `days` | int | ❌ | Market forecast days, 7–30 |

---

### `POST /api/disease-detect`

Detect crop disease from a leaf image upload.

**Request**: `multipart/form-data` with:
- `image` — JPEG / PNG / WebP / BMP leaf image (max 16 MB)
- `crop` — crop key (optional, default: `default`)

**Example response**

```json
{
  "crop": "tomato",
  "model": "EfficientNet-B0 (PlantVillage, 38-class)",
  "disease": { "name": "Early Blight", "pathogen": "Alternaria solani (fungal)", "confidence_percent": 91.4 },
  "symptoms": "Circular brown spots with concentric rings on older leaves.",
  "treatment_guide": {
    "treatment": "Spray copper oxychloride or mancozeb.",
    "pesticide_recommendation": "Copper Oxychloride 50 WP @ 2.5 g/L water",
    "prevention_advice": "Mulching; remove infected leaves; avoid overhead irrigation."
  }
}
```

---

### `GET /api/crops`

Returns the full crop database as a JSON array (ideal temperature, water requirements, soil types, etc.).

---

## Project Structure

```
harvest/
├── app.py                        # Flask app, ML models, all route handlers
├── requirements.txt              # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css             # All styles — responsive grid, panels, charts
│   ├── js/
│   │   ├── main.js               # Frontend logic — API calls, rendering, i18n
│   │   └── sw.js                 # Service worker (PWA offline cache)
│   ├── data/
│   │   └── crops.json            # Crop database (50+ crops with agronomy data)
│   ├── icons/                    # PWA icons
│   └── manifest.json             # PWA web-app manifest
└── templates/
    └── index.html                # Single-page application shell

android/                          # Native Android app (WebView wrapper)
├── app/
│   ├── build.gradle              # App-level Gradle config (set SERVER_URL here)
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── kotlin/com/agrivision/harvest/
│       │   └── MainActivity.kt   # WebView activity with GPS & camera support
│       └── res/
│           ├── layout/activity_main.xml
│           ├── values/           # strings, colors, themes
│           └── xml/file_paths.xml
├── build.gradle                  # Root Gradle config
├── gradle.properties
└── settings.gradle
```

---

## License

This project is open-source. Feel free to use and adapt it for agricultural research and education.

