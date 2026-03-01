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
| Android App | Kotlin, WebView, AndroidX |

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

## Android Mobile App

The repository includes a native Android app (`android/`) that wraps the AgriVision web app in a
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

android/                        # Native Android app (WebView wrapper)
├── app/
│   ├── build.gradle            # App-level Gradle config (set SERVER_URL here)
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── kotlin/com/agrivision/harvest/
│       │   └── MainActivity.kt # WebView activity with GPS & camera support
│       └── res/
│           ├── layout/activity_main.xml
│           ├── values/         # strings, colors, themes
│           └── xml/file_paths.xml
├── build.gradle                # Root Gradle config
├── gradle.properties
└── settings.gradle
```

---

## License

This project is open-source. Feel free to use and adapt it for agricultural research and education.
