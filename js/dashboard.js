import data from "./shortcuts.js";
import { exportConfig, importConfig } from "./config-manager.js";
import { getAllData } from "./link-manager.js";

/* =========================
   State & DOM
========================= */
const state = {
  activeCategory: "all",
  searchQuery: "",
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  theme: localStorage.getItem("theme") || "dark",
};

const dom = {
  sidebarCats: document.getElementById("sidebar-categories"),
  viewContainer: document.getElementById("view-container"),
  filterInput: document.getElementById("filter"),
  searchInput: document.getElementById("search-input"),
  clock: document.getElementById("clock"),
  dateDisplay: document.getElementById("date-display"),
  greeting: document.getElementById("greeting"),
  sidebarNav: document.querySelector(".sidebar-nav"),
  themeToggle: document.getElementById("theme-toggle"),
  exportConfigBtn: document.getElementById("export-config"),
  importConfigBtn: document.getElementById("import-config"),
  importFileInput: document.getElementById("import-file-input"),
};

/* =========================
   Icons (Lucide/Heroicons SVG strings)
========================= */
const ICONS = {
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  "graduation-cap": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  terminal: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  "gamepad-2": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`,
  newspaper: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  "shopping-cart": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  joystick: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z"/><path d="M6 15v-2"/><path d="M12 15V9"/><circle cx="12" cy="6" r="3"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  server: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
  flag: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
};

/* =========================
   Logic
 ========================= */

const FAVICON_CACHE_KEY = "favicons_cache";
const FAVICON_CACHE_EXPIRY_DAYS = 30;

/**
 * Get favicon URL with caching
 * @param {string} url - The URL to get favicon for
 * @returns {string} - The favicon URL
 */
function getFavicon(url) {
  const cache = getFaviconCache();
  const cacheKey = url;

  if (cache[cacheKey]) {
    const cached = cache[cacheKey];
    const now = Date.now();
    const expiryTime =
      cached.timestamp + FAVICON_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (now < expiryTime) {
      return cached.faviconUrl;
    }
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;

  cache[cacheKey] = {
    faviconUrl: faviconUrl,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Failed to save favicon cache:", e);
  }

  return faviconUrl;
}

/**
 * Get favicon cache from localStorage
 * @returns {Object} - The cache object
 */
function getFaviconCache() {
  try {
    const cached = localStorage.getItem(FAVICON_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.warn("Failed to parse favicon cache:", e);
    return {};
  }
}

/**
 * Clear expired favicon cache entries
 */
function clearExpiredFaviconCache() {
  const cache = getFaviconCache();
  const now = Date.now();
  const expiryTime = now - FAVICON_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  let hasExpired = false;
  for (const key in cache) {
    if (cache[key].timestamp < expiryTime) {
      delete cache[key];
      hasExpired = true;
    }
  }

  if (hasExpired) {
    try {
      localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("Failed to save favicon cache after cleanup:", e);
    }
  }
}

function updateTime() {
  const now = new Date();
  dom.clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  dom.dateDisplay.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = now.getHours();
  let greeting = "Good Evening,";
  if (hour < 12) greeting = "Good Morning,";
  else if (hour < 18) greeting = "Good Afternoon,";

  dom.greeting.textContent = `${greeting} Marcin`;
}

function toggleTheme() {
  const isDark = state.theme === "dark";
  state.theme = isDark ? "light" : "dark";

  applyTheme();
  localStorage.setItem("theme", state.theme);
}

function applyTheme() {
  const isDark = state.theme === "dark";
  document.documentElement.setAttribute("data-theme", state.theme);

  const icon = dom.themeToggle.querySelector(".icon");
  icon.innerHTML = isDark ? ICONS.moon : ICONS.sun;

  icon.animate(
    [
      { transform: "rotate(0deg) scale(0.5)" },
      { transform: "rotate(360deg) scale(1)" },
    ],
    {
      duration: 500,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  );
}

function renderSidebar() {
  dom.sidebarCats.innerHTML = "";
  const allData = getAllData();
  allData.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${state.activeCategory === cat.category ? "active" : ""}`;
    btn.onclick = () => setActiveCategory(cat.category);

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    btn.append(iconSpan, labelSpan);
    dom.sidebarCats.appendChild(btn);
  });
}

function setActiveCategory(cat) {
  state.activeCategory = cat;

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    const isAll = cat === "all" && el.dataset.cat === "all";
    const isCat = el.textContent.trim() === cat;
    if (isAll || isCat) el.classList.add("active");
  });

  renderView();
}

function renderLinkCard(name, url, categoryColor, categoryName) {
  const card = document.createElement("a");
  card.href = url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.dataset.category = categoryName;
  card.dataset.name = name;

  const icon = document.createElement("img");
  icon.src = getFavicon(url);
  icon.loading = "lazy";

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = name;

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${state.favorites.has(url) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.favorites.has(url)) state.favorites.delete(url);
    else state.favorites.add(url);
    localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
    renderView();
  };

  card.append(icon, title, favBtn);
  return card;
}

function renderView() {
  // Preserve RSS and Notes sections before clearing
  const rssSection = document.getElementById("rss-section");
  const notesSection = document.getElementById("notes-section");
  
  dom.viewContainer.innerHTML = "";
  const query = state.searchQuery.toLowerCase();
  const allData = getAllData();

  let filteredData = allData;

  // Re-append preserved sections
  if (rssSection) dom.viewContainer.appendChild(rssSection);
  if (notesSection) dom.viewContainer.appendChild(notesSection);

  if (query) {
    const allLinks = [];
    allData.forEach((cat) => {
      Object.entries(cat.items).forEach(([name, url]) => {
        if (
          name.toLowerCase().includes(query) ||
          url.toLowerCase().includes(query)
        ) {
          allLinks.push({
            name,
            url,
            category: cat.category,
            color: cat.color,
          });
        }
      });
    });

    if (allLinks.length === 0) {
      dom.viewContainer.innerHTML = `<div class="empty-state">No results found for "${state.searchQuery}"</div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid-view";
    allLinks.forEach((link) => {
      grid.appendChild(renderLinkCard(link.name, link.url, link.color, link.category));
    });
    dom.viewContainer.appendChild(grid);
    
    // Re-append preserved sections
    if (rssSection) dom.viewContainer.appendChild(rssSection);
    if (notesSection) dom.viewContainer.appendChild(notesSection);
    return;
  }

  if (state.activeCategory !== "all") {
    filteredData = allData.filter((c) => c.category === state.activeCategory);
  }

  filteredData.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";

    const header = document.createElement("h2");
    header.className = `category-header ${cat.color}`;
    header.innerHTML = `<span class="cat-dot"></span>${cat.category}`;
    header.style.cursor = "pointer";
    header.onclick = () => setActiveCategory(cat.category);

    const grid = document.createElement("div");
    grid.className = "grid-view";

    Object.entries(cat.items).forEach(([name, url]) => {
      grid.appendChild(renderLinkCard(name, url, cat.color, cat.category));
    });

    section.append(header, grid);
    dom.viewContainer.appendChild(section);
  });
  
  // Re-append RSS and Notes sections at the end
  if (rssSection) dom.viewContainer.appendChild(rssSection);
  if (notesSection) dom.viewContainer.appendChild(notesSection);
}

dom.filterInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  renderView();
});

document.querySelector('[data-cat="all"]').onclick = () =>
  setActiveCategory("all");

dom.themeToggle.onclick = toggleTheme;

/* =========================
   Config Export/Import
   ========================= */

// Export configuration
dom.exportConfigBtn?.addEventListener("click", () => {
  try {
    exportConfig();
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export configuration: " + error.message);
  }
});

// Import configuration - trigger file input
dom.importConfigBtn?.addEventListener("click", () => {
  dom.importFileInput.click();
});

// Import configuration - handle file selection
dom.importFileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (confirm("Importing configuration will overwrite your current settings. Continue?")) {
    importConfig(file)
      .then(() => {
        // Page will reload automatically on successful import
      })
      .catch((error) => {
        console.error("Import failed:", error);
        alert("Failed to import configuration: " + error.message);
        // Reset file input
        e.target.value = "";
      });
  } else {
    // Reset file input if cancelled
    e.target.value = "";
  }
});

clearExpiredFaviconCache();
setInterval(updateTime, 1000);
updateTime();
applyTheme();
renderSidebar();
renderView();

// Listen for shortcuts changes from link manager
document.addEventListener("shortcutsChanged", () => {
  renderSidebar();
  renderView();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== dom.filterInput && document.activeElement !== dom.searchInput) {
    e.preventDefault();
    dom.filterInput.focus();
  }
});
