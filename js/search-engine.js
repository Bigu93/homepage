/**
 * Search Engine Integration
 * Handles search engine selection and web search functionality
 */

/* =========================
   Constants
   ========================= */
const STORAGE_KEY = "search_engine";
const DEFAULT_ENGINE = "google";

/* =========================
   Search Engines Configuration
   ========================= */
const SEARCH_ENGINES = {
  google: {
    name: "Google",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    url: "https://www.google.com/search?q={query}",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    url: "https://duckduckgo.com/?q={query}",
  },
  bing: {
    name: "Bing",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    url: "https://www.bing.com/search?q={query}",
  },
  wikipedia: {
    name: "Wikipedia",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5a2.5 2.5 0 0 0 0 5"/><path d="M15.5 15.5a2.5 2.5 0 0 0 0-5"/></svg>`,
    url: "https://en.wikipedia.org/wiki/Special:Search?search={query}",
  },
  youtube: {
    name: "YouTube",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    url: "https://www.youtube.com/results?search_query={query}",
  },
  github: {
    name: "GitHub",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
    url: "https://github.com/search?q={query}",
  },
};

/* =========================
   State
   ========================= */
let selectedEngine = localStorage.getItem(STORAGE_KEY) || DEFAULT_ENGINE;

/* =========================
   DOM Elements
   ========================= */
const dom = {
  searchInput: document.getElementById("search-input"),
  engineSelector: document.getElementById("search-engine-selector"),
  engineDropdown: document.getElementById("search-engine-dropdown"),
  engineButton: document.getElementById("search-engine-button"),
};

/* =========================
   Functions
   ========================= */

/**
 * Get the currently selected search engine
 * @returns {string} The engine key
 */
export function getSelectedEngine() {
  return selectedEngine;
}

/**
 * Set the selected search engine
 * @param {string} engineKey - The engine key to select
 */
export function setSelectedEngine(engineKey) {
  if (!SEARCH_ENGINES[engineKey]) {
    console.warn(`Unknown search engine: ${engineKey}`);
    return;
  }
  selectedEngine = engineKey;
  localStorage.setItem(STORAGE_KEY, engineKey);
  updateEngineSelector();
}

/**
 * Get all available search engines
 * @returns {Object} The search engines object
 */
export function getSearchEngines() {
  return SEARCH_ENGINES;
}

/**
 * Perform a search using the selected engine
 * @param {string} query - The search query
 */
export function performSearch(query) {
  if (!query || query.trim() === "") {
    return;
  }

  const engine = SEARCH_ENGINES[selectedEngine];
  const url = engine.url.replace("{query}", encodeURIComponent(query.trim()));
  window.location.href = url;
}

/**
 * Update the search engine selector UI
 */
function updateEngineSelector() {
  if (!dom.engineButton) return;

  const engine = SEARCH_ENGINES[selectedEngine];
  const iconSpan = dom.engineButton.querySelector(".engine-icon");
  const nameSpan = dom.engineButton.querySelector(".engine-name");

  if (iconSpan) iconSpan.innerHTML = engine.icon;
  if (nameSpan) nameSpan.textContent = engine.name;
}

/**
 * Toggle the search engine dropdown
 */
function toggleDropdown() {
  if (!dom.engineDropdown) return;
  dom.engineDropdown.classList.toggle("visible");
}

/**
 * Close the search engine dropdown
 */
function closeDropdown() {
  if (!dom.engineDropdown) return;
  dom.engineDropdown.classList.remove("visible");
}

/**
 * Create dropdown options
 */
function createDropdownOptions() {
  if (!dom.engineDropdown) return;

  dom.engineDropdown.innerHTML = "";

  Object.entries(SEARCH_ENGINES).forEach(([key, engine]) => {
    const option = document.createElement("button");
    option.className = `search-engine-option ${key === selectedEngine ? "active" : ""}`;
    option.dataset.engine = key;
    option.innerHTML = `
      <span class="option-icon">${engine.icon}</span>
      <span class="option-name">${engine.name}</span>
    `;
    option.onclick = () => {
      setSelectedEngine(key);
      closeDropdown();
    };
    dom.engineDropdown.appendChild(option);
  });
}

/**
 * Handle search input
 */
function handleSearchInput(e) {
  const query = e.target.value;

  if (e.key === "Enter") {
    e.preventDefault();
    performSearch(query);
  }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    dom.searchInput?.focus();
  }

  if (e.key === "Escape") {
    closeDropdown();
  }
}

/* =========================
   Initialization
   ========================= */

/**
 * Initialize the search engine module
 */
export function initSearchEngine() {
  if (!SEARCH_ENGINES[selectedEngine]) {
    selectedEngine = DEFAULT_ENGINE;
    localStorage.setItem(STORAGE_KEY, DEFAULT_ENGINE);
  }

  if (!dom.engineSelector && dom.searchInput) {
    createSearchEngineSelector();
  }

  updateEngineSelector();
  createDropdownOptions();

  if (dom.engineButton) {
    dom.engineButton.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  if (dom.searchInput) {
    dom.searchInput.addEventListener("keydown", handleSearchInput);
  }

  document.addEventListener("click", (e) => {
    if (
      dom.engineSelector &&
      !dom.engineSelector.contains(e.target)
    ) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", handleKeyboardShortcuts);
}

/**
 * Create search engine selector UI elements
 */
function createSearchEngineSelector() {
  const searchContainer = dom.searchInput.closest(".search-container");
  if (!searchContainer) return;

  const selector = document.createElement("div");
  selector.id = "search-engine-selector";
  selector.className = "search-engine-selector";

  const button = document.createElement("button");
  button.id = "search-engine-button";
  button.className = "search-engine-button";
  button.type = "button";
  button.innerHTML = `
    <span class="engine-icon"></span>
    <span class="engine-name"></span>
    <span class="dropdown-arrow">▼</span>
  `;

  const dropdown = document.createElement("div");
  dropdown.id = "search-engine-dropdown";
  dropdown.className = "search-engine-dropdown";

  selector.append(button, dropdown);

  searchContainer.insertBefore(selector, dom.searchInput);

  dom.engineSelector = selector;
  dom.engineButton = button;
  dom.engineDropdown = dropdown;

  dom.searchInput.placeholder = "Search the web...";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearchEngine);
} else {
  initSearchEngine();
}
