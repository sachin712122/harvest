/* ============================================================
   Smart Crop Yield Prediction System — Frontend Logic
   ============================================================ */

"use strict";

// ── State ──────────────────────────────────────────────────
let currentYieldPerAcre = null;
let selectedCrop = "rice";

const CROP_LABELS = {
  // Food Grains
  rice:          "Rice",
  wheat:         "Wheat",
  maize:         "Maize",
  barley:        "Barley",
  sorghum:       "Sorghum (Jowar)",
  ragi:          "Ragi (Finger Millet)",
  cumbu:         "Cumbu (Pearl Millet)",
  thinai:        "Thinai (Foxtail Millet)",
  kodo_millet:   "Kodo Millet",
  little_millet: "Little Millet",
  // Pulses
  black_gram:    "Black Gram (Urad Dal)",
  green_gram:    "Green Gram (Moong Dal)",
  red_gram:      "Red Gram (Tur Dal)",
  horse_gram:    "Horse Gram",
  chickpea:      "Chickpea (Gram)",
  // Oilseeds
  groundnut:     "Groundnut",
  sesame:        "Sesame (Gingelly)",
  coconut:       "Coconut",
  castor:        "Castor",
  sunflower:     "Sunflower",
  soybean:       "Soybean",
  mustard:       "Mustard",
  // Commercial / Cash Crops
  sugarcane:     "Sugarcane",
  cotton:        "Cotton",
  tobacco:       "Tobacco",
  // Plantation Crops
  coffee:        "Coffee",
  tea:           "Tea",
  rubber:        "Rubber",
  // Spices
  turmeric:      "Turmeric",
  chilli:        "Chilli",
  coriander:     "Coriander",
  pepper:        "Pepper",
  cardamom:      "Cardamom",
  // Fruits
  banana:        "Banana",
  mango:         "Mango",
  sapota:        "Sapota (Chikoo)",
  guava:         "Guava",
  papaya:        "Papaya",
  jackfruit:     "Jackfruit",
  // Vegetables
  tomato:        "Tomato",
  brinjal:       "Brinjal (Eggplant)",
  onion:         "Onion",
  potato:        "Potato",
  cabbage:       "Cabbage",
  drumstick:     "Drumstick (Moringa)",
  bhindi:        "Bhindi (Okra)",
  tapioca:       "Tapioca",
  // Floriculture
  jasmine:       "Jasmine",
  rose:          "Rose",
  marigold:      "Marigold",
  tuberose:      "Tuberose",
};

// ── DOM helpers ────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);

function setStatus(msg, type = "info", showSpinner = false) {
  const banner = $("status-banner");
  banner.className = `visible ${type}`;
  banner.innerHTML = showSpinner
    ? `<span class="spinner"></span><span>${msg}</span>`
    : `<span>${msg}</span>`;
}

function hideStatus() {
  $("status-banner").className = "";
  $("status-banner").innerHTML = "";
}

function showResults() {
  $("results").classList.add("visible");
}

function hideResults() {
  $("results").classList.remove("visible");
  currentYieldPerAcre = null;
  hideTotalYield();
  $("suitability-section").style.display = "none";
}

function hideTotalYield() {
  $("total-yield-result").classList.remove("visible");
}

// ── Render helpers ─────────────────────────────────────────

function renderLocation(loc) {
  $("loc-district").textContent = loc.district    || "—";
  $("loc-state").textContent    = loc.state       || "—";
  $("loc-country").textContent  = loc.country     || "—";
  $("loc-display").textContent  = loc.display_name || "—";
}

function renderWeather(w) {
  $("w-temp").textContent     = `${w.current_temperature} °C`;
  $("w-humidity").textContent = `${w.humidity} %`;
  $("w-wind").textContent     = `${w.wind_speed} km/h`;
  $("w-rainfall").textContent = `${w.seasonal_rainfall} mm`;
  $("w-precip").textContent   = `${w.current_precipitation} mm`;
  $("w-pressure").textContent = `${w.pressure} hPa`;
}

function renderSoil(soil, season) {
  $("soil-type").textContent     = soil.type || "—";
  $("soil-moisture").textContent = `${soil.moisture} %`;
  $("season-name").textContent   = season || "—";
}

function renderPrediction(pred, crop) {
  const label = CROP_LABELS[crop] || CROP_LABELS["rice"];
  currentYieldPerAcre = pred.yield_per_acre_kg;
  $("pred-section-title").textContent = `🤖 ML Yield Prediction (${label})`;
  $("pred-per-acre").textContent    = pred.yield_per_acre_kg.toLocaleString();
  $("pred-per-hectare").textContent = pred.yield_per_hectare_tons.toLocaleString();
  $("calc-yield-readonly").value    = pred.yield_per_acre_kg;
}

function renderTotalYield(data) {
  const box = $("total-yield-result");
  box.innerHTML = `
    <div class="total-yield-box">
      <div>
        <div class="big">${data.total_kg.toLocaleString()} kg</div>
        <div class="small">Total yield from ${data.area_acres} acres</div>
      </div>
      <div class="also">≈ ${data.total_tons.toLocaleString()} tons</div>
      <div class="also">(${data.area_hectares} ha)</div>
    </div>`;
  box.classList.add("visible");
}

function renderCropSuitability(suit, crop) {
  const section = $("suitability-section");
  if (!suit) {
    section.style.display = "none";
    return;
  }

  const label = CROP_LABELS[crop] || crop;
  $("suit-crop-name").textContent = label;

  const pct = Math.round(suit.overall_suitability * 100);
  const badge = $("suit-badge");
  if (pct >= 85) {
    badge.textContent = "✅ Excellent";
    badge.className = "suit-badge excellent";
  } else if (pct >= 70) {
    badge.textContent = "👍 Good";
    badge.className = "suit-badge good";
  } else if (pct >= 55) {
    badge.textContent = "⚠️ Fair";
    badge.className = "suit-badge fair";
  } else {
    badge.textContent = "❌ Poor";
    badge.className = "suit-badge poor";
  }

  function setBar(barId, valId, score) {
    const pctVal = Math.round(score * 100);
    const el = $(barId);
    el.style.width = `${pctVal}%`;
    el.style.background = pctVal >= 85 ? "#4caf50"
                        : pctVal >= 70 ? "#8bc34a"
                        : pctVal >= 55 ? "#ff9800"
                        : "#f44336";
    $(valId).textContent = `${pctVal}%`;
  }

  setBar("suit-temp-bar",     "suit-temp-val",    suit.temperature_score);
  setBar("suit-rain-bar",     "suit-rain-val",     suit.rainfall_score);
  setBar("suit-overall-bar",  "suit-overall-val",  suit.overall_suitability);

  const soils = (suit.suitable_soils || []).join(", ") || "—";
  $("suitability-meta").innerHTML = `
    <span>🌡️ Optimal temp: <strong>${suit.optimal_temp_c} °C</strong> (range ${suit.temp_range})</span>
    <span>💧 Water need: <strong>${suit.water_requirement_mm} mm/season</strong></span>
    <span>🪨 Suited soils: <strong>${soils}</strong></span>
    <span>🌊 Flood tolerance: <strong>${suit.flood_tolerance}</strong></span>
    <span>☀️ Drought tolerance: <strong>${suit.drought_tolerance}</strong></span>`;

  section.style.display = "block";
}

// ── Main: Detect Location ──────────────────────────────────
async function detectLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by your browser.", "error");
    return;
  }

  hideResults();
  $("detect-btn").disabled = true;
  setStatus("Requesting location permission…", "info", true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude: lat, longitude: lon, accuracy } = position.coords;
      setStatus(
        `Location captured (±${Math.round(accuracy)} m). Fetching data…`,
        "info",
        true
      );

      $("coord-lat").textContent = lat.toFixed(5);
      $("coord-lon").textContent = lon.toFixed(5);
      $("coord-accuracy").textContent = `±${Math.round(accuracy)} m`;

      try {
        const resp = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lon, crop: selectedCrop }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${resp.status}`);
        }

        const data = await resp.json();

        renderLocation(data.location);
        renderWeather(data.weather);
        renderSoil(data.soil, data.season);
        renderPrediction(data.prediction, data.crop || selectedCrop);
        renderCropSuitability(data.crop_suitability, data.crop || selectedCrop);

        showResults();
        setStatus(
          `Analysis complete for ${data.location.district}, ${data.location.state}.`,
          "success"
        );
      } catch (err) {
        setStatus(`Error: ${err.message}`, "error");
      } finally {
        $("detect-btn").disabled = false;
      }
    },
    (error) => {
      const messages = {
        1: "Location permission denied. Please allow location access and try again.",
        2: "Location unavailable. Check your device settings.",
        3: "Location request timed out. Please try again.",
      };
      setStatus(messages[error.code] || "Unknown geolocation error.", "error");
      $("detect-btn").disabled = false;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

// ── Yield Calculator ───────────────────────────────────────
async function calculateYield() {
  const areaInput = $("area-acres").value.trim();
  if (!areaInput || isNaN(areaInput) || Number(areaInput) <= 0) {
    $("calc-error").textContent = "Please enter a valid area in acres.";
    return;
  }
  $("calc-error").textContent = "";

  const yieldPerAcre = currentYieldPerAcre;
  if (!yieldPerAcre) {
    $("calc-error").textContent = "No yield prediction available. Detect location first.";
    return;
  }

  try {
    $("calc-btn").disabled = true;
    const resp = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yield_per_acre: yieldPerAcre,
        area_acres: Number(areaInput),
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const data = await resp.json();
    renderTotalYield(data);
  } catch (err) {
    $("calc-error").textContent = `Error: ${err.message}`;
  } finally {
    $("calc-btn").disabled = false;
  }
}

// ── Event listeners ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  $("detect-btn").addEventListener("click", detectLocation);
  $("calc-btn").addEventListener("click", calculateYield);

  $("area-acres").addEventListener("keydown", (e) => {
    if (e.key === "Enter") calculateYield();
  });

  // Crop selector buttons
  document.querySelectorAll(".crop-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".crop-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCrop = btn.dataset.crop;
      // Reset results so the user re-detects with the new crop
      hideResults();
      hideStatus();
    });
  });
});
