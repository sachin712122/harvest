/* ============================================================
   Smart Crop Yield Prediction System — Frontend Logic
   ============================================================ */

"use strict";

// ── State ──────────────────────────────────────────────────
let currentYieldPerAcre = null;

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

function renderPrediction(pred) {
  currentYieldPerAcre = pred.yield_per_acre_kg;
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
          body: JSON.stringify({ lat, lon }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${resp.status}`);
        }

        const data = await resp.json();

        renderLocation(data.location);
        renderWeather(data.weather);
        renderSoil(data.soil, data.season);
        renderPrediction(data.prediction);

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
});
