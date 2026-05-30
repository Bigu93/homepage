// js/weather.js
// Fetches OpenWeatherMap, renders chip in header, caches 15min.

import { openSettings } from "./crud/settings.js";

const CACHE_KEY = "weather_cache_v1";
const STALE_MS = 15 * 60 * 1000;

const ICON_MAP = {
  Clear: "☀",
  Clouds: "☁",
  Rain: "🌧",
  Drizzle: "🌦",
  Thunderstorm: "⛈",
  Snow: "❄",
  Mist: "🌫",
  Fog: "🌫",
  Haze: "🌫",
  Smoke: "🌫",
};

let chip, iconEl, tempEl;
let overlayRef = null;

export function initWeather({ overlay }) {
  overlayRef = overlay;
  chip = document.getElementById("weather-chip");
  chip.onclick = () => openSettings("weather");
  ensureChildren();
  render();
  window.addEventListener("focus", () => {
    const cache = readCache();
    if (!cache || Date.now() - cache.fetchedAt > STALE_MS) refresh();
  });
}

function ensureChildren() {
  chip.innerHTML = `
    <span class="weather-icon">⚙</span>
    <span class="weather-temp">Set up weather</span>
    <span class="weather-loc" hidden></span>
  `;
  iconEl = chip.querySelector(".weather-icon");
  tempEl = chip.querySelector(".weather-temp");
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(obj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn("[weather] cache write failed:", e);
  }
}

function _backendWeatherUrl(cfg) {
  const sync = overlayRef?.settings?.sync;
  if (sync?.enabled && sync?.baseUrl && cfg?.label) {
    const base = sync.baseUrl.replace(/\/+$/, "");
    return `${base}/api/v1/weather?city=${encodeURIComponent(cfg.label)}&units=${cfg.units || "metric"}`;
  }
  return null;
}

export function refresh() {
  const cfg = overlayRef.settings.weather;
  const backendUrl = _backendWeatherUrl(cfg);

  // Backend mode: no API key needed on client
  if (backendUrl) {
    fetch(backendUrl, {
      headers: { Authorization: `Bearer ${overlayRef.settings.sync.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        writeCache({
          data: {
            temp: data.main.temp,
            feels: data.main.feels_like,
            humidity: data.main.humidity,
            label: cfg.label,
            icon: ICON_MAP[data.weather[0]?.main] || "•",
            units: cfg.units || "metric",
          },
          fetchedAt: Date.now(),
          lat: cfg.lat,
          lon: cfg.lon,
        });
        render();
      })
      .catch((e) => {
        console.warn("[weather] backend fetch failed:", e);
        renderError(e.message);
      });
    return;
  }

  if (!cfg || !cfg.apiKey || cfg.lat == null || cfg.lon == null)
    return render();
  fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${cfg.lat}&lon=${cfg.lon}&units=${cfg.units || "metric"}&appid=${cfg.apiKey}`,
  )
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      writeCache({
        data: {
          temp: data.main.temp,
          feels: data.main.feels_like,
          humidity: data.main.humidity,
          label: cfg.label,
          icon: ICON_MAP[data.weather[0]?.main] || "•",
          units: cfg.units || "metric",
        },
        fetchedAt: Date.now(),
        lat: cfg.lat,
        lon: cfg.lon,
      });
      render();
    })
    .catch((e) => {
      console.warn("[weather] fetch failed:", e);
      renderError(e.message);
    });
}

export function render() {
  const cfg = overlayRef.settings.weather;
  const hasBackendWeather = !!_backendWeatherUrl(cfg);
  const hasDirectWeather = !!(cfg?.apiKey && cfg.lat != null && cfg.lon != null);
  if (!hasBackendWeather && !hasDirectWeather) {
    chip.className = "weather-chip unconfigured";
    iconEl.textContent = "⚙";
    tempEl.textContent = "Set up weather";
    chip.title = "Click to set up weather";
    chip.querySelector(".weather-loc").hidden = true;
    return;
  }
  const cache = readCache();
  if (cache && Date.now() - cache.fetchedAt < STALE_MS && _cacheMatches(cache, cfg)) {
    paintFromCache(cache);
  } else {
    paintFromCache(
      cache || {
        data: { temp: "—", icon: "…", label: cfg.label, units: cfg.units },
        fetchedAt: Date.now(),
      },
    );
    refresh();
  }
}

function _cacheMatches(cache, cfg) {
  const cached = cache.data || {};
  return cached.label === cfg.label && cached.units === (cfg.units || "metric");
}

function paintFromCache(cache) {
  const d = cache.data;
  chip.className = "weather-chip";
  iconEl.textContent = d.icon;
  tempEl.textContent = `${typeof d.temp === "number" ? Math.round(d.temp) + "°" : d.temp}`;
  const loc = chip.querySelector(".weather-loc");
  loc.hidden = false;
  loc.textContent = (d.label || "").slice(0, 14);
  if (d.feels != null && d.humidity != null) {
    const ago = Math.round((Date.now() - cache.fetchedAt) / 60000);
    chip.title = `Feels like ${Math.round(d.feels)}°, humidity ${d.humidity}%, updated ${ago}m ago`;
  } else {
    chip.title = "Loading weather…";
  }
}

function renderError(msg) {
  chip.className = "weather-chip error";
  iconEl.textContent = "⚠";
  tempEl.textContent = "Weather unavailable";
  chip.querySelector(".weather-loc").hidden = true;
  chip.title = `Error: ${msg}`;
}
