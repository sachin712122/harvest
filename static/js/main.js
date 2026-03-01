/* ============================================================
   AgriVision – AI-Powered Agricultural Intelligence Platform
   Frontend Logic
   ============================================================ */

"use strict";

// ── State ──────────────────────────────────────────────────
let currentYieldPerAcre = null;
let selectedCrop = "rice";
let currentLang = "en";

// Default soil values — must match the HTML `value` attributes in #unified-n/p/k/ph.
// Used as fallbacks when the user clears the optional input fields.
const DEFAULT_N  = 80;
const DEFAULT_P  = 45;
const DEFAULT_K  = 50;
const DEFAULT_PH = 6.5;

const CROP_LABELS = {
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
  black_gram:    "Black Gram (Urad Dal)",
  green_gram:    "Green Gram (Moong Dal)",
  red_gram:      "Red Gram (Tur Dal)",
  horse_gram:    "Horse Gram",
  chickpea:      "Chickpea (Gram)",
  groundnut:     "Groundnut",
  sesame:        "Sesame (Gingelly)",
  coconut:       "Coconut",
  castor:        "Castor",
  sunflower:     "Sunflower",
  soybean:       "Soybean",
  mustard:       "Mustard",
  sugarcane:     "Sugarcane",
  cotton:        "Cotton",
  tobacco:       "Tobacco",
  coffee:        "Coffee",
  tea:           "Tea",
  rubber:        "Rubber",
  turmeric:      "Turmeric",
  chilli:        "Chilli",
  coriander:     "Coriander",
  pepper:        "Pepper",
  cardamom:      "Cardamom",
  banana:        "Banana",
  mango:         "Mango",
  sapota:        "Sapota (Chikoo)",
  guava:         "Guava",
  papaya:        "Papaya",
  jackfruit:     "Jackfruit",
  tomato:        "Tomato",
  brinjal:       "Brinjal (Eggplant)",
  onion:         "Onion",
  potato:        "Potato",
  cabbage:       "Cabbage",
  drumstick:     "Drumstick (Moringa)",
  bhindi:        "Bhindi (Okra)",
  tapioca:       "Tapioca",
  jasmine:       "Jasmine",
  rose:          "Rose",
  marigold:      "Marigold",
  tuberose:      "Tuberose",
};

// Tamil crop names
const CROP_LABELS_TA = {
  rice:          "அரிசி",
  wheat:         "கோதுமை",
  maize:         "சோளம்",
  barley:        "வாற்கோதுமை",
  sorghum:       "ஜோவர்",
  ragi:          "கேழ்வரகு",
  cumbu:         "கம்பு",
  thinai:        "தினை",
  kodo_millet:   "வரகு",
  little_millet: "சாமை",
  black_gram:    "உளுந்து",
  green_gram:    "பாசிப்பருப்பு",
  red_gram:      "துவரம்பருப்பு",
  horse_gram:    "கொள்ளு",
  chickpea:      "கடலை",
  groundnut:     "நிலக்கடலை",
  sesame:        "எள்ளு",
  coconut:       "தேங்காய்",
  castor:        "ஆமணக்கு",
  sunflower:     "சூரியகாந்தி",
  soybean:       "சோயாபீன்",
  mustard:       "கடுகு",
  sugarcane:     "கரும்பு",
  cotton:        "பருத்தி",
  tobacco:       "புகையிலை",
  coffee:        "காபி",
  tea:           "தேயிலை",
  rubber:        "ரப்பர்",
  turmeric:      "மஞ்சள்",
  chilli:        "மிளகாய்",
  coriander:     "கொத்தமல்லி",
  pepper:        "மிளகு",
  cardamom:      "ஏலம்",
  banana:        "வாழை",
  mango:         "மாம்பழம்",
  sapota:        "சப்போட்டா",
  guava:         "கொய்யா",
  papaya:        "பப்பாளி",
  jackfruit:     "பலாப்பழம்",
  tomato:        "தக்காளி",
  brinjal:       "கத்தரிக்காய்",
  onion:         "வெங்காயம்",
  potato:        "உருளைக்கிழங்கு",
  cabbage:       "முட்டைக்கோஸ்",
  drumstick:     "முருங்கை",
  bhindi:        "வெண்டை",
  tapioca:       "மரவள்ளி",
  jasmine:       "மல்லிகை",
  rose:          "ரோஜா",
  marigold:      "சாமந்தி",
  tuberose:      "ஜாதிமல்லி",
};

// ── i18n translations ──────────────────────────────────────
const I18N = {
  en: {
    heroTitle:          "🌾 Complete Farm Intelligence — All at Once",
    heroDesc:           "Select your crop and detect your location. Yield prediction, climate forecast, soil analysis, market prices, and personalised advisory will all be calculated together on this single page.",
    analyseBtn:         "Detect My Location & Analyse Everything",
    manualCoords:       "or enter coordinates manually:",
    analyseManual:      "Analyse",
    latPlaceholder:     "Latitude",
    lonPlaceholder:     "Longitude",
    catFoodGrains:      "🌾 Food Grains",
    catPulses:          "🫘 Pulses",
    catOilseeds:        "🌻 Oilseeds",
    catCommercial:      "🏭 Commercial Crops",
    catPlantation:      "☕ Plantation Crops",
    catSpices:          "🌶️ Spices",
    catFruits:          "🍌 Fruits",
    catVegetables:      "🥕 Vegetables",
    catFloriculture:    "🌸 Floriculture",
    catOther:           "✏️ Other",
    otherCropBtn:       "✏️ Other Crop",
    otherCropLabel:     "Enter crop name:",
    otherCropPlaceholder: "e.g. Lemon, Turmeric…",
    close:              "Close",
    langToggle:         "🌐 தமிழ்",
  },
  ta: {
    heroTitle:          "🌾 முழுமையான வேளாண் நுண்ணறிவு — ஒரே நேரத்தில்",
    heroDesc:           "உங்கள் பயிரைத் தேர்ந்தெடுத்து இடத்தைக் கண்டறியுங்கள். விளைச்சல் கணிப்பு, காலநிலை முன்னறிவிப்பு, மண் பகுப்பாய்வு, சந்தை விலைகள் மற்றும் தனிப்பயனாக்கப்பட்ட ஆலோசனை அனைத்தும் இந்த ஒரே பக்கத்தில் கணக்கிடப்படும்.",
    analyseBtn:         "என் இடத்தைக் கண்டறிந்து அனைத்தையும் பகுப்பாய்க",
    manualCoords:       "அல்லது கோர்டினேட்களை கைமுறையாக உள்ளிடுக:",
    analyseManual:      "பகுப்பாய்",
    latPlaceholder:     "அட்சரேகை",
    lonPlaceholder:     "தீர்க்கரேகை",
    catFoodGrains:      "🌾 உணவு தானியங்கள்",
    catPulses:          "🫘 பருப்பு வகைகள்",
    catOilseeds:        "🌻 எண்ணெய் வித்துக்கள்",
    catCommercial:      "🏭 வணிக பயிர்கள்",
    catPlantation:      "☕ தோட்டப் பயிர்கள்",
    catSpices:          "🌶️ மசாலாப் பொருட்கள்",
    catFruits:          "🍌 பழங்கள்",
    catVegetables:      "🥕 காய்கறிகள்",
    catFloriculture:    "🌸 மலர்ச்சாகுபடி",
    catOther:           "✏️ பிற",
    otherCropBtn:       "✏️ பிற பயிர்",
    otherCropLabel:     "பயிர் பெயரை உள்ளிடுக:",
    otherCropPlaceholder: "எ.கா. எலுமிச்சை, மஞ்சள்…",
    close:              "மூடு",
    langToggle:         "🌐 English",
  },
};

// Apply i18n to the page
function applyLang(lang) {
  const t = I18N[lang];
  const cropLabels = lang === "ta" ? CROP_LABELS_TA : CROP_LABELS;

  // Text nodes
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Placeholder attributes
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  // Title attributes
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (t[key] !== undefined) el.title = t[key];
  });

  // Crop button labels (use data-i18n-crop attribute)
  document.querySelectorAll("[data-i18n-crop]").forEach((el) => {
    const cropKey = el.dataset.i18nCrop;
    const label = cropLabels[cropKey];
    if (label) {
      // Preserve the leading emoji if present
      const emojiMatch = el.textContent.match(/^(\S+\s)/);
      el.textContent = emojiMatch ? emojiMatch[1] + label : label;
    }
  });

  // Language toggle button label
  const langBtn = $("lang-toggle-btn");
  if (langBtn && t.langToggle) langBtn.textContent = t.langToggle;
}

// Crops available in the market forecast dropdown
const MARKET_CROPS = new Set([
  "rice","wheat","maize","soybean","cotton","sugarcane",
  "groundnut","mustard","onion","tomato","potato","chickpea"
]);

// Crops available in the soil / advisory dropdowns
const SOIL_ADV_CROPS = new Set([
  "rice","wheat","maize","tomato","potato","cotton",
  "sugarcane","soybean","groundnut"
]);

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

function setModuleStatus(id, msg, type = "info", showSpinner = false) {
  const el = $(id);
  if (!el) return;
  el.className = `module-status visible ${type}`;
  el.innerHTML = showSpinner
    ? `<span class="spinner"></span><span>${msg}</span>`
    : `<span>${msg}</span>`;
}

function clearModuleStatus(id) {
  const el = $(id);
  if (!el) return;
  el.className = "module-status";
  el.innerHTML = "";
}

function showResults() { $("results").classList.add("visible"); }
function hideResults() {
  $("results").classList.remove("visible");
  currentYieldPerAcre = null;
  hideTotalYield();
  $("suitability-section").style.display = "none";
}
function hideTotalYield() { $("total-yield-result").classList.remove("visible"); }

// ── Geolocation helper ─────────────────────────────────────
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const msgs = {
          1: "Location permission denied. Please allow location access.",
          2: "Location unavailable. Check your device settings.",
          3: "Location request timed out.",
        };
        reject(new Error(msgs[err.code] || "Unknown geolocation error."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
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
  if (!suit) { section.style.display = "none"; return; }

  const label = CROP_LABELS[crop] || crop;
  $("suit-crop-name").textContent = label;

  const pct = Math.round(suit.overall_suitability * 100);
  const badge = $("suit-badge");
  if (pct >= 85) { badge.textContent = "✅ Excellent"; badge.className = "suit-badge excellent"; }
  else if (pct >= 70) { badge.textContent = "👍 Good"; badge.className = "suit-badge good"; }
  else if (pct >= 55) { badge.textContent = "⚠️ Fair"; badge.className = "suit-badge fair"; }
  else { badge.textContent = "❌ Poor"; badge.className = "suit-badge poor"; }

  function setBar(barId, valId, score) {
    const pctVal = Math.round(score * 100);
    const el = $(barId);
    el.style.width = `${pctVal}%`;
    el.style.background = pctVal >= 85 ? "#4caf50" : pctVal >= 70 ? "#8bc34a" : pctVal >= 55 ? "#ff9800" : "#f44336";
    $(valId).textContent = `${pctVal}%`;
  }
  setBar("suit-temp-bar",    "suit-temp-val",    suit.temperature_score);
  setBar("suit-rain-bar",    "suit-rain-val",     suit.rainfall_score);
  setBar("suit-overall-bar", "suit-overall-val",  suit.overall_suitability);

  const soils = (suit.suitable_soils || []).join(", ") || "—";
  $("suitability-meta").innerHTML = `
    <span>🌡️ Optimal temp: <strong>${suit.optimal_temp_c} °C</strong> (range ${suit.temp_range})</span>
    <span>💧 Water need: <strong>${suit.water_requirement_mm} mm/season</strong></span>
    <span>🪨 Suited soils: <strong>${soils}</strong></span>
    <span>🌊 Flood tolerance: <strong>${suit.flood_tolerance}</strong></span>
    <span>☀️ Drought tolerance: <strong>${suit.drought_tolerance}</strong></span>`;
  section.style.display = "block";
}

// ── Yield Calculator ───────────────────────────────────────
async function calculateYield() {
  const areaInput = $("area-acres").value.trim();
  if (!areaInput || isNaN(areaInput) || Number(areaInput) <= 0) {
    $("calc-error").textContent = "Please enter a valid area in acres."; return;
  }
  $("calc-error").textContent = "";
  if (!currentYieldPerAcre) {
    $("calc-error").textContent = "No yield prediction available. Detect location first."; return;
  }
  try {
    $("calc-btn").disabled = true;
    const resp = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yield_per_acre: currentYieldPerAcre, area_acres: Number(areaInput) }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Server error ${resp.status}`); }
    renderTotalYield(await resp.json());
  } catch (err) {
    $("calc-error").textContent = `Error: ${err.message}`;
  } finally {
    $("calc-btn").disabled = false;
  }
}

// ══════════════════════════════════════════════════════════
// Climate Intelligence Module
// ══════════════════════════════════════════════════════════
async function runClimateAnalysis(lat, lon) {
  setModuleStatus("climate-status", "Fetching 14-day forecast…", "info", true);

  try {
    const resp = await fetch("/api/climate-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Server error ${resp.status}`); }
    const data = await resp.json();
    renderClimateResults(data);
    clearModuleStatus("climate-status");
  } catch (err) {
    setModuleStatus("climate-status", `Error: ${err.message}`, "error");
  }
}

function renderClimateResults(data) {
  const s = data.summary;
  const idx = data.indices;
  const rec = data.recommendations;

  $("cli-avg-temp").textContent    = `${s.avg_temperature_c} °C`;
  $("cli-rain").textContent        = `${s.total_precipitation_mm} mm`;
  $("cli-heat").textContent        = `${Math.round(idx.heat_stress_index * 100)}%`;
  $("cli-rain-score").textContent  = `${Math.round(idx.rainfall_adequacy_score * 100)}%`;
  $("cli-drought").textContent     = `${Math.round(idx.drought_probability * 100)}%`;
  $("cli-deficit").textContent     = `${s.water_deficit_mm} mm`;

  // Colour drought card
  const droughtCard = $("cli-drought").closest(".info-card");
  if (idx.drought_probability > 0.6)      droughtCard.classList.add("alert-high");
  else if (idx.drought_probability > 0.3) droughtCard.classList.add("alert-medium");

  // Recommendations
  const advDiv = $("climate-advisory");
  advDiv.innerHTML = [
    { icon: "🌱", title: "Sowing Window",       text: rec.best_sowing_window },
    { icon: "💧", title: "Irrigation",           text: rec.irrigation_recommendation },
    { icon: "⚠️", title: "Harvest Risk Warning", text: rec.harvest_risk_warning },
  ].map(({ icon, title, text }) =>
    `<div class="advisory-card"><div class="adv-card-title">${icon} ${title}</div><p>${text}</p></div>`
  ).join("");

  // Forecast table
  const tbody = $("forecast-tbody");
  tbody.innerHTML = (data.forecast_days || []).map((d) =>
    `<tr>
       <td>${d.date}</td>
       <td class="${d.temp_max > 35 ? 'heat-warn' : ''}">${d.temp_max}</td>
       <td>${d.temp_min}</td>
       <td class="${d.precipitation_mm > 15 ? 'rain-warn' : ''}">${d.precipitation_mm}</td>
       <td>${d.et0_mm}</td>
     </tr>`
  ).join("");
}

// ══════════════════════════════════════════════════════════
// Soil Intelligence Module
// ══════════════════════════════════════════════════════════
async function runSoilAnalysis() {
  const n  = parseFloat($("soil-n").value);
  const p  = parseFloat($("soil-p").value);
  const k  = parseFloat($("soil-k").value);
  const ph = parseFloat($("soil-ph").value);
  const cropSel = $("soil-crop-sel").value;
  const moistureVal = $("soil-moisture-input").value;

  if (isNaN(n) || isNaN(p) || isNaN(k) || isNaN(ph)) {
    $("soil-error").textContent = "N, P, K and pH are required."; return;
  }
  $("soil-error").textContent = "";
  $("soil-results").style.display = "none";
  setModuleStatus("soil-status", "Analysing soil data…", "info", true);

  const body = { N: n, P: p, K: k, pH: ph, crop: cropSel };
  if (moistureVal) body.moisture = parseFloat(moistureVal);

  try {
    const resp = await fetch("/api/soil-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Server error ${resp.status}`); }
    const data = await resp.json();
    renderSoilResults(data);
    clearModuleStatus("soil-status");
  } catch (err) {
    setModuleStatus("soil-status", `Error: ${err.message}`, "error");
  }
}

function renderSoilResults(data) {
  const statusColor = { optimal: "#4caf50", deficient: "#f44336", excess: "#ff9800" };

  // Nutrient status cards
  const grid = $("soil-nutrient-grid");
  grid.innerHTML = Object.entries(data.nutrient_status).map(([k, v]) =>
    `<div class="info-card soil">
       <span class="icon" style="color:${statusColor[v]}">${v === "optimal" ? "✅" : v === "deficient" ? "⬇️" : "⬆️"}</span>
       <div><div class="label">${k} Status</div>
            <div class="value" style="color:${statusColor[v]}">${v.charAt(0).toUpperCase() + v.slice(1)}</div></div>
     </div>`
  ).join("");

  // Scores card with bars
  const scores = data.nutrient_scores;
  $("soil-scores-card").innerHTML = Object.entries(scores)
    .filter(([k]) => k !== "overall_score")
    .map(([k, v]) => {
      const pct = Math.round(v * 100);
      const col = pct >= 85 ? "#4caf50" : pct >= 70 ? "#8bc34a" : pct >= 55 ? "#ff9800" : "#f44336";
      return `<div class="suit-score-item">
        <div class="suit-score-label">${k.replace("_score","").toUpperCase()}</div>
        <div class="suit-score-bar-wrap"><div class="suit-score-bar" style="width:${pct}%;background:${col}"></div></div>
        <div class="suit-score-val">${pct}%</div>
      </div>`;
    }).join("") +
    `<div class="suit-score-item suit-overall">
       <div class="suit-score-label">⭐ Overall Score</div>
       <div class="suit-score-bar-wrap"><div class="suit-score-bar" style="width:${Math.round(scores.overall_score*100)}%;background:#4caf50"></div></div>
       <div class="suit-score-val">${Math.round(scores.overall_score*100)}%</div>
     </div>`;

  // Suitable crops tags
  $("soil-suitable-crops").innerHTML = (data.suitable_crops || []).map((c) =>
    `<span class="crop-tag">${c.charAt(0).toUpperCase() + c.slice(1)}</span>`
  ).join("");

  // Fertilizer plan list
  $("soil-fertilizer-plan").innerHTML = (data.fertilizer_plan || []).map((item) =>
    `<li>${item}</li>`
  ).join("");

  // Soil actions list
  $("soil-actions").innerHTML = (data.soil_improvement_actions || []).map((item) =>
    `<li>${item}</li>`
  ).join("");

  // Moisture advice
  const moistureAdviceEl = $("soil-moisture-advice");
  if (data.moisture_advice) {
    moistureAdviceEl.textContent = `💧 ${data.moisture_advice}`;
    moistureAdviceEl.style.display = "block";
  } else {
    moistureAdviceEl.style.display = "none";
  }

  $("soil-results").style.display = "block";
}

// ══════════════════════════════════════════════════════════
// Disease Detection Module
// ══════════════════════════════════════════════════════════
async function runDiseaseDetection() {
  const fileInput   = $("disease-image");
  const cropSel     = $("disease-crop-sel").value;

  if (!fileInput.files || fileInput.files.length === 0) {
    $("disease-error").textContent = "Please select a leaf image to upload."; return;
  }
  $("disease-error").textContent = "";
  $("disease-results").style.display = "none";
  setModuleStatus("disease-status", "Analysing image…", "info", true);

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);
  formData.append("crop", cropSel);

  try {
    const resp = await fetch("/api/disease-detect", { method: "POST", body: formData });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Server error ${resp.status}`); }
    const data = await resp.json();
    renderDiseaseResults(data);
    clearModuleStatus("disease-status");
  } catch (err) {
    setModuleStatus("disease-status", `Error: ${err.message}`, "error");
  }
}

function renderDiseaseResults(data) {
  const conf = data.disease.confidence_percent;
  const confColor = conf >= 85 ? "#c62828" : conf >= 70 ? "#e65100" : "#f9a825";

  $("disease-result-card").innerHTML = `
    <div class="disease-header">
      <div class="disease-name">🦠 ${data.disease.name}</div>
      <div class="confidence-badge" style="background:${confColor}">
        ${conf}% Confidence
      </div>
    </div>
    <div class="disease-meta">
      <span><strong>Crop:</strong> ${data.crop}</span>
      <span><strong>Pathogen:</strong> ${data.disease.pathogen}</span>
      ${data.image_size !== "0×0" ? `<span><strong>Image size:</strong> ${data.image_size}</span>` : ""}
    </div>
    <div class="disease-symptoms"><strong>Symptoms:</strong> ${data.symptoms}</div>`;

  const tg = data.treatment_guide;
  $("treatment-card").innerHTML = `
    <div class="treatment-item"><span class="treat-icon">💊</span>
      <div><strong>Treatment</strong><p>${tg.treatment}</p></div>
    </div>
    <div class="treatment-item"><span class="treat-icon">🧪</span>
      <div><strong>Pesticide Recommendation</strong><p>${tg.pesticide_recommendation}</p></div>
    </div>
    <div class="treatment-item"><span class="treat-icon">🛡️</span>
      <div><strong>Prevention</strong><p>${tg.prevention_advice}</p></div>
    </div>`;

  $("disease-results").style.display = "block";
}

// ══════════════════════════════════════════════════════════
// Market Price Forecast Module
// ══════════════════════════════════════════════════════════
async function runMarketForecast() {
  const crop = $("market-crop-sel").value;
  const days = parseInt($("market-days").value, 10);

  $("market-results").style.display = "none";
  setModuleStatus("market-status", "Generating price forecast…", "info", true);

  try {
    const resp = await fetch("/api/market-forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, days }),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Server error ${resp.status}`); }
    const data = await resp.json();
    renderMarketResults(data);
    clearModuleStatus("market-status");
  } catch (err) {
    setModuleStatus("market-status", `Error: ${err.message}`, "error");
  }
}

function renderMarketResults(data) {
  const an = data.analysis;

  // Summary cards
  $("market-summary-grid").innerHTML = [
    { icon: "💰", label: "Current Price",  val: `₹${data.current_price_per_quintal} /qtl` },
    { icon: "📉", label: "Min Forecast",   val: `₹${an.min_price} /qtl` },
    { icon: "📈", label: "Max Forecast",   val: `₹${an.max_price} /qtl` },
    { icon: "📊", label: "Avg Forecast",   val: `₹${an.avg_price} /qtl` },
    { icon: "🔄", label: "Trend",          val: an.trend_direction },
    { icon: "📐", label: "Change",         val: `${an.trend_change_pct > 0 ? "+" : ""}${an.trend_change_pct}%` },
  ].map(({ icon, label, val }) =>
    `<div class="info-card weather"><span class="icon">${icon}</span>
       <div><div class="label">${label}</div><div class="value">${val}</div></div>
     </div>`
  ).join("");

  // Recommendation box
  const recBox = $("market-recommendation-box");
  const isHold = data.recommendation.includes("Hold");
  const isSell = data.recommendation.includes("Sell Now");
  recBox.className = `market-rec-box ${isHold ? "rec-hold" : isSell ? "rec-sell" : "rec-stable"}`;
  recBox.innerHTML = `<strong>${isHold ? "📦 Hold / Store" : isSell ? "💸 Sell Now" : "🔁 Stable Market"}</strong>
    <p>${data.recommendation}</p>
    <p class="price-range">Expected range: ${an.expected_price_range}</p>`;

  // Chart
  const labels = data.price_series.map((d) => d.date.slice(5)); // MM-DD
  const prices = data.price_series.map((d) => d.price_per_quintal);

  const canvas = $("market-chart");
  const ctx = canvas.getContext("2d");
  // Simple line chart (no external library — no destroy needed)
  drawLineChart(ctx, canvas, labels, prices, "₹/quintal");

  // Table
  $("market-tbody").innerHTML = data.price_series.map((d) =>
    `<tr><td>${d.date}</td><td>₹${d.price_per_quintal}</td></tr>`
  ).join("");

  $("market-results").style.display = "block";
}

function drawLineChart(ctx, canvas, labels, values, yLabel) {
  const W = canvas.width  = canvas.parentElement.clientWidth || 600;
  const H = canvas.height = 280;
  const padL = 70, padR = 20, padT = 20, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  const minV = Math.min(...values) * 0.98;
  const maxV = Math.max(...values) * 1.02;
  const rangeV = maxV - minV || 1;

  const xScale = (i) => padL + (i / (values.length - 1)) * chartW;
  const yScale = (v) => padT + chartH - ((v - minV) / rangeV) * chartH;

  // Grid lines
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padT + (i / 5) * chartH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
    const val = Math.round(maxV - (i / 5) * rangeV);
    ctx.fillStyle = "#666"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
    ctx.fillText(val, padL - 6, y + 4);
  }

  // Y-axis label
  ctx.save(); ctx.translate(14, padT + chartH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#555"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(yLabel, 0, 0); ctx.restore();

  // Gradient fill
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, "rgba(76,175,80,0.35)");
  grad.addColorStop(1, "rgba(76,175,80,0)");
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(values[0]));
  values.forEach((v, i) => ctx.lineTo(xScale(i), yScale(v)));
  ctx.lineTo(xScale(values.length - 1), padT + chartH);
  ctx.lineTo(xScale(0), padT + chartH);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(values[0]));
  values.forEach((v, i) => ctx.lineTo(xScale(i), yScale(v)));
  ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2.5; ctx.stroke();

  // Dots + X-axis labels
  const step = Math.max(1, Math.floor(values.length / 7));
  values.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(xScale(i), yScale(v), 3, 0, Math.PI * 2);
    ctx.fillStyle = "#1b5e20"; ctx.fill();

    if (i % step === 0 || i === values.length - 1) {
      ctx.fillStyle = "#444"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(labels[i], xScale(i), H - 12);
    }
  });
}

// ══════════════════════════════════════════════════════════
// Unified Advisory Engine
// ══════════════════════════════════════════════════════════
async function runAdvisory() {
  const lat  = parseFloat($("adv-lat").value);
  const lon  = parseFloat($("adv-lon").value);
  const n    = parseFloat($("adv-n").value);
  const p    = parseFloat($("adv-p").value);
  const k    = parseFloat($("adv-k").value);
  const ph   = parseFloat($("adv-ph").value);
  const crop = $("adv-crop").value;
  const area = $("adv-area").value;

  if (isNaN(lat) || isNaN(lon)) { $("advisory-error").textContent = "Please provide valid coordinates."; return; }
  if (isNaN(n) || isNaN(p) || isNaN(k) || isNaN(ph)) { $("advisory-error").textContent = "N, P, K and pH are required."; return; }
  $("advisory-error").textContent = "";

  $("advisory-results").style.display = "none";
  setModuleStatus("advisory-status", "Generating comprehensive advisory report…", "info", true);

  const body = { lat, lon, N: n, P: p, K: k, pH: ph, crop };
  if (area) body.area_acres = parseFloat(area);

  try {
    const resp = await fetch("/api/full-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Server error ${resp.status}`); }
    const data = await resp.json();
    renderAdvisoryResults(data);
    clearModuleStatus("advisory-status");
  } catch (err) {
    setModuleStatus("advisory-status", `Error: ${err.message}`, "error");
  }
}

function renderAdvisoryResults(data) {
  const riskColors = { Low: "#4caf50", Moderate: "#ff9800", High: "#f44336" };
  const riskColor  = riskColors[data.risk_level] || "#888";

  $("advisory-risk-box").innerHTML = `
    <div class="risk-badge" style="background:${riskColor}">
      ${data.risk_level === "High" ? "🔴" : data.risk_level === "Moderate" ? "🟡" : "🟢"}
      ${data.risk_level} Risk
    </div>
    <p>Overall farm risk based on climate indices, soil health, and crop conditions.</p>`;

  const adv = data.advisory;
  $("advisory-report").innerHTML = [
    { icon: "🌱", title: "Best Crop Recommendation", text: adv.best_crop_recommendation },
    { icon: "📅", title: "Sowing Advice",             text: adv.sowing_advice },
    { icon: "💧", title: "Irrigation Schedule",       text: adv.irrigation_schedule },
    { icon: "🧴", title: "Fertilizer Plan",           text: Array.isArray(adv.fertilizer_plan) ? adv.fertilizer_plan.join(" | ") : adv.fertilizer_plan },
    { icon: "🦠", title: "Disease Alert",             text: adv.disease_alert },
    { icon: "💰", title: "Market Selling Strategy",   text: adv.market_selling_strategy },
    { icon: "📊", title: "Expected Yield Estimate",   text: adv.expected_yield_estimate },
  ].map(({ icon, title, text }) =>
    `<div class="advisory-card">
       <div class="adv-card-title">${icon} ${title}</div>
       <p>${text}</p>
     </div>`
  ).join("");

  // Supporting data mini-cards
  const sd = data.supporting_data;
  $("advisory-data-grid").innerHTML = [
    { icon: "🌡️", label: "Avg Temperature",     val: `${sd.climate_summary.avg_temperature_c} °C` },
    { icon: "🌧️", label: "14d Rainfall",         val: `${sd.climate_summary.total_precipitation_mm} mm` },
    { icon: "🔥", label: "Heat Stress",           val: `${Math.round(sd.climate_indices.heat_stress_index * 100)}%` },
    { icon: "☀️", label: "Drought Probability",  val: `${Math.round(sd.climate_indices.drought_probability * 100)}%` },
    { icon: "🧪", label: "Soil Overall Score",    val: `${Math.round(sd.soil_scores.overall_score * 100)}%` },
    { icon: "📈", label: "Market Trend",          val: sd.market_analysis.trend_direction },
  ].map(({ icon, label, val }) =>
    `<div class="info-card soil"><span class="icon">${icon}</span>
       <div><div class="label">${label}</div><div class="value">${val}</div></div>
     </div>`
  ).join("");

  $("advisory-results").style.display = "block";
}

// ══════════════════════════════════════════════════════════
// Unified Analysis — runs ALL modules simultaneously
// ══════════════════════════════════════════════════════════
async function runUnifiedAnalysis(lat, lon, accuracy) {
  const btn    = $("unified-analyse-btn");
  const manBtn = $("unified-manual-btn");
  btn.disabled = true;
  if (manBtn) manBtn.disabled = true;

  setStatus("Analysing your farm across all modules…", "info", true);

  // Show dashboard early so loading states are visible
  $("unified-dashboard").style.display = "grid";

  // Fill coordinate display
  $("coord-lat").textContent      = lat.toFixed(5);
  $("coord-lon").textContent      = lon.toFixed(5);
  $("coord-accuracy").textContent = accuracy ? `±${Math.round(accuracy)} m` : "—";

  // Read optional unified form inputs (with sensible defaults)
  const n    = parseFloat($("unified-n").value)    || DEFAULT_N;
  const p    = parseFloat($("unified-p").value)    || DEFAULT_P;
  const k    = parseFloat($("unified-k").value)    || DEFAULT_K;
  const ph   = parseFloat($("unified-ph").value)   || DEFAULT_PH;
  const area = parseFloat($("unified-area").value) || null;

  // Pre-fill soil form with the values being used
  $("soil-n").value  = n;
  $("soil-p").value  = p;
  $("soil-k").value  = k;
  $("soil-ph").value = ph;
  const soilCropVal = SOIL_ADV_CROPS.has(selectedCrop) ? selectedCrop : "default";
  $("soil-crop-sel").value = soilCropVal;

  // Pre-fill advisory custom form
  $("adv-lat").value  = lat.toFixed(5);
  $("adv-lon").value  = lon.toFixed(5);
  $("adv-n").value    = n;
  $("adv-p").value    = p;
  $("adv-k").value    = k;
  $("adv-ph").value   = ph;
  const advCropVal = SOIL_ADV_CROPS.has(selectedCrop) ? selectedCrop : "rice";
  $("adv-crop").value = advCropVal;
  if (area) $("adv-area").value = area;

  // Sync market crop selector
  const mktCropVal = MARKET_CROPS.has(selectedCrop) ? selectedCrop : "rice";
  $("market-crop-sel").value = mktCropVal;

  try {
    // Show loading states in all panels
    setModuleStatus("climate-status",  "Fetching 14-day forecast…", "info", true);
    setModuleStatus("market-status",   "Generating price forecast…", "info", true);
    setModuleStatus("soil-status",     "Analysing soil data…", "info", true);
    setModuleStatus("advisory-status", "Generating advisory report…", "info", true);

    // Run yield + climate + market in parallel
    const [yieldData, climateData, marketData] = await Promise.all([
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, crop: selectedCrop, area_acres: area }),
      }).then((r) => { if (!r.ok) throw new Error(`Yield API error ${r.status}`); return r.json(); }),

      fetch("/api/climate-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      }).then((r) => { if (!r.ok) throw new Error(`Climate API error ${r.status}`); return r.json(); }),

      fetch("/api/market-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop: mktCropVal, days: 14 }),
      }).then((r) => { if (!r.ok) throw new Error(`Market API error ${r.status}`); return r.json(); }),
    ]);

    // Render yield / location / weather / soil
    if (yieldData.error) throw new Error(yieldData.error);
    renderLocation(yieldData.location);
    renderWeather(yieldData.weather);
    renderSoil(yieldData.soil, yieldData.season);
    renderPrediction(yieldData.prediction, yieldData.crop || selectedCrop);
    renderCropSuitability(yieldData.crop_suitability, yieldData.crop || selectedCrop);
    showResults();
    if (area && $("area-acres")) $("area-acres").value = area;

    // Render climate
    if (climateData.error) throw new Error(climateData.error);
    renderClimateResults(climateData);
    clearModuleStatus("climate-status");

    // Render market
    if (marketData.error) throw new Error(marketData.error);
    renderMarketResults(marketData);
    clearModuleStatus("market-status");

    // Now run soil + advisory in parallel
    const advBody = { lat, lon, N: n, P: p, K: k, pH: ph, crop: advCropVal };
    if (area) advBody.area_acres = area;

    const [, advisoryData] = await Promise.all([
      runSoilAnalysis(),
      fetch("/api/full-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(advBody),
      }).then((r) => { if (!r.ok) throw new Error(`Advisory API error ${r.status}`); return r.json(); }),
    ]);

    if (advisoryData && !advisoryData.error) {
      renderAdvisoryResults(advisoryData);
      clearModuleStatus("advisory-status");
    } else if (advisoryData && advisoryData.error) {
      setModuleStatus("advisory-status", `Advisory error: ${advisoryData.error}`, "error");
    }

    const loc = yieldData.location;
    const cropLabelMap = currentLang === "ta" ? CROP_LABELS_TA : CROP_LABELS;
    const rawLabel = cropLabelMap[selectedCrop] || CROP_LABELS[selectedCrop]
      || selectedCrop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setStatus(
      `✅ Complete analysis for ${loc.district}, ${loc.state} · ${rawLabel}`,
      "success"
    );

    // Smooth scroll to dashboard
    $("unified-dashboard").scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    if (manBtn) manBtn.disabled = false;
  }
}

// ── Event listeners ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Crop selection
  document.querySelectorAll(".crop-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.id === "other-crop-btn") {
        // Show the "Other" input row
        document.querySelectorAll(".crop-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $("other-crop-row").style.display = "flex";
        $("other-crop-input").focus();
        return;
      }
      document.querySelectorAll(".crop-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCrop = btn.dataset.crop;
      // Hide other-crop row when a normal crop is selected
      $("other-crop-row").style.display = "none";
    });
  });

  // "Other" crop input — update selectedCrop as user types
  $("other-crop-input").addEventListener("input", () => {
    const val = $("other-crop-input").value.trim();
    selectedCrop = val.toLowerCase().replace(/\s+/g, "_") || "other";
  });
  $("other-crop-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("other-crop-input").blur();
  });

  // Close "Other" input row
  $("other-crop-close").addEventListener("click", () => {
    $("other-crop-row").style.display = "none";
    $("other-crop-input").value = "";
    // Reactivate "rice" as default
    document.querySelectorAll(".crop-btn").forEach((b) => b.classList.remove("active"));
    const riceBtn = document.querySelector(".crop-btn[data-crop='rice']");
    if (riceBtn) riceBtn.classList.add("active");
    selectedCrop = "rice";
  });

  // Language toggle
  $("lang-toggle-btn").addEventListener("click", () => {
    currentLang = currentLang === "en" ? "ta" : "en";
    applyLang(currentLang);
  });

  // Unified "Detect & Analyse" button
  $("unified-analyse-btn").addEventListener("click", async () => {
    try {
      $("unified-analyse-btn").disabled = true;
      setStatus("Requesting location permission…", "info", true);
      const { lat, lon, accuracy } = await getLocation();
      await runUnifiedAnalysis(lat, lon, accuracy);
    } catch (err) {
      setStatus(`Error: ${err.message}`, "error");
      $("unified-analyse-btn").disabled = false;
    }
  });

  // Manual coordinate entry button
  $("unified-manual-btn").addEventListener("click", async () => {
    const lat = parseFloat($("unified-lat").value);
    const lon = parseFloat($("unified-lon").value);
    if (isNaN(lat) || isNaN(lon)) {
      setStatus("Please enter valid latitude and longitude.", "error"); return;
    }
    await runUnifiedAnalysis(lat, lon, null);
  });

  // Yield calculator
  $("calc-btn").addEventListener("click", calculateYield);
  $("area-acres").addEventListener("keydown", (e) => { if (e.key === "Enter") calculateYield(); });

  // Soil panel
  $("soil-btn").addEventListener("click", runSoilAnalysis);

  // Disease panel
  $("disease-btn").addEventListener("click", runDiseaseDetection);

  // Upload area click
  const uploadArea = $("upload-area");
  const fileInput  = $("disease-image");
  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", (e) => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      showImagePreview(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) showImagePreview(fileInput.files[0]);
  });

  function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      $("upload-preview").innerHTML = `<img src="${ev.target.result}" alt="Leaf preview" class="leaf-preview" />`;
    };
    reader.readAsDataURL(file);
  }

  // Market panel
  $("market-btn").addEventListener("click", runMarketForecast);
  $("market-days").addEventListener("input", () => {
    $("market-days-val").textContent = `${$("market-days").value} days`;
  });

  // Advisory re-run form
  $("advisory-btn").addEventListener("click", runAdvisory);
  $("adv-loc-btn").addEventListener("click", async () => {
    try {
      $("adv-loc-btn").disabled = true;
      const { lat, lon } = await getLocation();
      $("adv-lat").value = lat.toFixed(5);
      $("adv-lon").value = lon.toFixed(5);
    } catch (err) {
      $("advisory-error").textContent = `Location error: ${err.message}`;
    } finally {
      $("adv-loc-btn").disabled = false;
    }
  });

});
