/* =========================
   Weather Widget Module
   ========================= */

const STORAGE_KEYS = {
  LOCATION: "weather_location",
  UNITS: "weather_units",
  CACHE: "weather_cache",
};

const WEATHER_ICONS = {
  clear: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  partlyCloudy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M2 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="M12 20v2"/><path d="m17.66 17.66-1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M16 16a6 6 0 0 0-8.49-8.49A6 6 0 0 0 16 16z"/></svg>`,
  cloudy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16a6 6 0 0 0-8.49-8.49A6 6 0 0 0 16 16z"/><path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3s1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/></svg>`,
  foggy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h16"/><path d="M4 18h16"/><path d="M4 10h16"/><path d="M8 6h8"/></svg>`,
  drizzle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13a4 4 0 0 0-8 0"/><path d="M12 2v2"/><path d="M20 10a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2"/><path d="M4 10a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2"/><path d="m8 21 2-4"/><path d="m12 21 2-4"/><path d="m16 21 2-4"/></svg>`,
  rain: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13a4 4 0 0 0-8 0"/><path d="M12 2v2"/><path d="M20 10a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2"/><path d="M4 10a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2"/><path d="m8 21 2-4"/><path d="m12 21 2-4"/><path d="m16 21 2-4"/></svg>`,
  snow: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`,
  thunderstorm: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="M13 11l-4 6h6l-4 6"/></svg>`,
  refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  location: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

const state = {
  location: null,
  units: "celsius",
  weatherData: null,
  isLoading: false,
};

/* =========================
   DOM Elements
   ========================= */
const dom = {
  widget: null,
  currentTemp: null,
  condition: null,
  locationName: null,
  forecastContainer: null,
  refreshBtn: null,
  settingsBtn: null,
  settingsModal: null,
};

/* =========================
   Weather Code Mapping
   ========================= */
function getWeatherIcon(code) {
  if (code === 0) return WEATHER_ICONS.clear;
  if (code >= 1 && code <= 3) return WEATHER_ICONS.partlyCloudy;
  if (code >= 45 && code <= 48) return WEATHER_ICONS.foggy;
  if (code >= 51 && code <= 57) return WEATHER_ICONS.drizzle;
  if (code >= 61 && code <= 67) return WEATHER_ICONS.rain;
  if (code >= 71 && code <= 77) return WEATHER_ICONS.snow;
  if (code >= 80 && code <= 82) return WEATHER_ICONS.rain;
  if (code >= 85 && code <= 86) return WEATHER_ICONS.snow;
  if (code >= 95 && code <= 99) return WEATHER_ICONS.thunderstorm;
  return WEATHER_ICONS.partlyCloudy;
}

function getWeatherCondition(code) {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Partly Cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Partly Cloudy";
}

/* =========================
   Temperature Conversion
   ========================= */
function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

function formatTemperature(celsius) {
  if (state.units === "fahrenheit") {
    return `${celsiusToFahrenheit(celsius)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

/* =========================
   Storage Functions
   ========================= */
function loadSettings() {
  try {
    const savedLocation = localStorage.getItem(STORAGE_KEYS.LOCATION);
    const savedUnits = localStorage.getItem(STORAGE_KEYS.UNITS);
    const savedCache = localStorage.getItem(STORAGE_KEYS.CACHE);

    if (savedLocation) {
      state.location = JSON.parse(savedLocation);
    }
    if (savedUnits) {
      state.units = savedUnits;
    }
    if (savedCache) {
      const cache = JSON.parse(savedCache);
      const now = Date.now();
      const cacheExpiry = 10 * 60 * 1000; // 10 minutes

      if (now - cache.timestamp < cacheExpiry) {
        state.weatherData = cache.data;
      }
    }
  } catch (e) {
    console.warn("Failed to load weather settings:", e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(state.location));
    localStorage.setItem(STORAGE_KEYS.UNITS, state.units);
  } catch (e) {
    console.warn("Failed to save weather settings:", e);
  }
}

function saveWeatherCache(data) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CACHE,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.warn("Failed to save weather cache:", e);
  }
}

/* =========================
   API Functions
   ========================= */
async function geocodeCity(cityName) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        name: result.name,
        country: result.country_code,
        lat: result.latitude,
        lon: result.longitude,
      };
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}

async function fetchWeather(lat, lon) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

async function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 10000 }
    );
  });
}

/* =========================
   Weather Logic
   ========================= */
async function loadWeather() {
  if (state.isLoading) return;

  state.isLoading = true;
  setLoadingState(true);

  try {
    let lat, lon;

    if (state.location) {
      lat = state.location.lat;
      lon = state.location.lon;
    } else {
      const position = await getCurrentPosition();
      lat = position.lat;
      lon = position.lon;
      state.location = {
        name: "Current Location",
        lat,
        lon,
      };
      saveSettings();
    }

    const weatherData = await fetchWeather(lat, lon);

    if (weatherData) {
      state.weatherData = weatherData;
      saveWeatherCache(weatherData);
      renderWeather();
    } else {
      showError("Failed to fetch weather data");
    }
  } catch (e) {
    console.error("Weather loading error:", e);
    if (e.message === "Geolocation not supported") {
      showError("Geolocation not supported. Please set a location manually.");
    } else if (e.code === 1) {
      showError("Location access denied. Please set a location manually.");
    } else {
      showError("Failed to load weather. Please try again.");
    }
  } finally {
    state.isLoading = false;
    setLoadingState(false);
  }
}

/* =========================
   UI Rendering
   ========================= */
function createWidget() {
  const widget = document.createElement("div");
  widget.className = "weather-widget";
  widget.innerHTML = `
    <div class="weather-header">
      <div class="weather-location">
        <span class="location-icon">${WEATHER_ICONS.location}</span>
        <span class="location-name">Loading...</span>
      </div>
      <div class="weather-controls">
        <button class="weather-refresh" title="Refresh">
          ${WEATHER_ICONS.refresh}
        </button>
        <button class="weather-settings" title="Settings">
          ${WEATHER_ICONS.settings}
        </button>
      </div>
    </div>
    <div class="weather-current">
      <div class="weather-icon-wrapper">
        <div class="weather-icon">${WEATHER_ICONS.clear}</div>
      </div>
      <div class="weather-info">
        <div class="weather-temp">--°</div>
        <div class="weather-condition">--</div>
      </div>
    </div>
    <div class="weather-forecast">
      <div class="forecast-list"></div>
    </div>
    <div class="weather-error" style="display: none;"></div>
  `;

  return widget;
}

function renderWeather() {
  if (!state.weatherData) return;

  const { current, daily } = state.weatherData;

  // Update current weather
  const tempEl = dom.widget.querySelector(".weather-temp");
  const conditionEl = dom.widget.querySelector(".weather-condition");
  const iconEl = dom.widget.querySelector(".weather-icon");
  const locationEl = dom.widget.querySelector(".location-name");

  tempEl.textContent = formatTemperature(current.temperature_2m);
  conditionEl.textContent = getWeatherCondition(current.weather_code);
  iconEl.innerHTML = getWeatherIcon(current.weather_code);

  if (state.location) {
    locationEl.textContent = state.location.name;
  }

  // Update forecast
  const forecastList = dom.widget.querySelector(".forecast-list");
  forecastList.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    if (!daily.time[i]) break;

    const date = new Date(daily.time[i]);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const icon = getWeatherIcon(daily.weather_code[i]);
    const maxTemp = formatTemperature(daily.temperature_2m_max[i]);
    const minTemp = formatTemperature(daily.temperature_2m_min[i]);

    const dayEl = document.createElement("div");
    dayEl.className = "forecast-day";
    dayEl.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-icon">${icon}</span>
      <span class="day-temp">${maxTemp} / ${minTemp}</span>
    `;
    forecastList.appendChild(dayEl);
  }

  // Hide error if visible
  const errorEl = dom.widget.querySelector(".weather-error");
  errorEl.style.display = "none";
}

function setLoadingState(loading) {
  const tempEl = dom.widget.querySelector(".weather-temp");
  const refreshBtn = dom.widget.querySelector(".weather-refresh");

  if (loading) {
    tempEl.textContent = "...";
    refreshBtn.classList.add("spinning");
  } else {
    refreshBtn.classList.remove("spinning");
  }
}

function showError(message) {
  const errorEl = dom.widget.querySelector(".weather-error");
  errorEl.textContent = message;
  errorEl.style.display = "block";

  const tempEl = dom.widget.querySelector(".weather-temp");
  const conditionEl = dom.widget.querySelector(".weather-condition");
  tempEl.textContent = "--";
  conditionEl.textContent = "Error";
}

/* =========================
   Settings Modal
   ========================= */
function createSettingsModal() {
  const modal = document.createElement("div");
  modal.className = "weather-modal";
  modal.innerHTML = `
    <div class="weather-modal-content">
      <div class="weather-modal-header">
        <h3>Weather Settings</h3>
        <button class="weather-modal-close">&times;</button>
      </div>
      <div class="weather-modal-body">
        <div class="form-group">
          <label for="weather-city">City Name</label>
          <input type="text" id="weather-city" placeholder="e.g., Warsaw, London" />
        </div>
        <div class="form-group">
          <label for="weather-units">Temperature Units</label>
          <select id="weather-units">
            <option value="celsius">Celsius (°C)</option>
            <option value="fahrenheit">Fahrenheit (°F)</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-primary">Save</button>
        </div>
      </div>
    </div>
  `;

  return modal;
}

function openSettings() {
  if (!dom.settingsModal) {
    dom.settingsModal = createSettingsModal();
    document.body.appendChild(dom.settingsModal);

    const cityInput = dom.settingsModal.querySelector("#weather-city");
    const unitsSelect = dom.settingsModal.querySelector("#weather-units");
    const closeBtn = dom.settingsModal.querySelector(".weather-modal-close");
    const cancelBtn = dom.settingsModal.querySelector(".btn-cancel");
    const saveBtn = dom.settingsModal.querySelector(".btn-primary");

    // Pre-fill values
    if (state.location && state.location.name !== "Current Location") {
      cityInput.value = state.location.name;
    }
    unitsSelect.value = state.units;

    // Event listeners
    const closeModal = () => {
      dom.settingsModal.classList.remove("visible");
      setTimeout(() => {
        if (dom.settingsModal && dom.settingsModal.parentNode) {
          dom.settingsModal.parentNode.removeChild(dom.settingsModal);
          dom.settingsModal = null;
        }
      }, 300);
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    saveBtn.onclick = async () => {
      const cityName = cityInput.value.trim();
      const units = unitsSelect.value;

      if (cityName) {
        const locationData = await geocodeCity(cityName);
        if (locationData) {
          state.location = locationData;
          state.units = units;
          saveSettings();
          loadWeather();
          closeModal();
        } else {
          alert("City not found. Please try another name.");
        }
      } else {
        // Use geolocation if no city specified
        state.location = null;
        state.units = units;
        saveSettings();
        loadWeather();
        closeModal();
      }
    };

    dom.settingsModal.onclick = (e) => {
      if (e.target === dom.settingsModal) {
        closeModal();
      }
    };
  }

  dom.settingsModal.classList.add("visible");
}

/* =========================
   Initialization
   ========================= */
function init() {
  loadSettings();

  // Create and insert widget
  dom.widget = createWidget();

  // Find the header to insert weather widget after
  const header = document.querySelector(".header");
  if (header) {
    header.insertAdjacentElement("afterend", dom.widget);
  } else {
    // Fallback: insert at beginning of main content
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.insertBefore(dom.widget, mainContent.firstChild);
    }
  }

  // Cache DOM elements
  dom.refreshBtn = dom.widget.querySelector(".weather-refresh");
  dom.settingsBtn = dom.widget.querySelector(".weather-settings");

  // Event listeners
  dom.refreshBtn.onclick = () => {
    loadWeather();
  };

  dom.settingsBtn.onclick = () => {
    openSettings();
  };

  // Load weather data
  if (state.weatherData) {
    renderWeather();
  } else {
    loadWeather();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
