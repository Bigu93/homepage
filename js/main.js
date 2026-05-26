// js/main.js
// App entry point. Loads overlay, merges with seed, wires modules.

import seed from "./shortcuts.js";
import {
  load as loadOverlay,
  save as saveOverlay,
  migrateLegacyFavorites,
} from "./storage.js";
import { merge } from "./data.js";
import { clearExpiredFavicons, initFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";
import {
  initSidebar,
  setActive as setSidebarActive,
  setData as setSidebarData,
  setFavorites as setSidebarFavorites,
} from "./render/sidebar.js";
import {
  initGrid,
  setData as setGridData,
  setState as setGridState,
} from "./render/grid.js";
import { initSettings } from "./crud/settings.js";
import { initLinkEditor, openLinkEditor } from "./crud/link-editor.js";
import {
  initCategoryEditor,
  openCategoryEditor,
} from "./crud/category-editor.js";
import { initDnD, attach as attachDnD } from "./crud/dnd.js";
import { initSearch, render as renderSearch } from "./search.js";
import { initWeather, render as renderWeather } from "./weather.js";
import { initTailscale } from "./tailscale.js";
import { initHelp } from "./help.js";
import { ICONS } from "./icons.js";
import { initStats } from "./stats.js";
import { init as initSync, push as syncPush } from "./sync.js";

let overlay = loadOverlay();
overlay = migrateLegacyFavorites(overlay, seed);
saveOverlay(overlay);
initStats(overlay);

let categories = merge(seed, overlay);

const state = {
  activeCategory: "all",
  searchQuery: "",
  favorites: new Set(overlay.favorites || []),
};

function selectCategory(cat) {
  state.activeCategory = cat;
  setSidebarActive(cat);
  setGridState({ activeCategory: cat });
}

function toggleFavorite(linkId) {
  if (state.favorites.has(linkId)) state.favorites.delete(linkId);
  else state.favorites.add(linkId);
  overlay.favorites = [...state.favorites];
  saveOverlay(overlay);
  setGridState({});
  setSidebarFavorites(state.favorites);
}

initFavicons(overlay);
clearExpiredFavicons();
initTheme();
startClock(overlay.settings?.username || "Marcin");
initSidebar({
  data: categories,
  activeCategory: state.activeCategory,
  onCategorySelect: selectCategory,
  onEditCategory: (catId) => openCategoryEditor({ categoryId: catId }),
  onAddCategory: () => openCategoryEditor({}),
  favorites: state.favorites,
});
initGrid({
  data: categories,
  state,
  onToggleFavorite: toggleFavorite,
  onEditLink: (linkId) => openLinkEditor({ linkId }),
  onAddLinkToCategory: (catId) => openLinkEditor({ defaultCategoryId: catId }),
  onEditCategory: (catId) => openCategoryEditor({ categoryId: catId }),
});
initSettings({
  overlay,
  onChange: () => {
    refreshData();
  },
});
initLinkEditor({
  overlay,
  getCategories: () => categories,
  onChange: refreshData,
});
initCategoryEditor({
  overlay,
  getCategories: () => categories,
  onChange: refreshData,
});

initDnD({
  overlay,
  onChange: refreshData,
});
attachDnD();

document.querySelector('[data-cat="all"]').onclick = () =>
  selectCategory("all");

initSearch({
  overlay,
  getCategories: () => categories,
});

initWeather({ overlay });
initTailscale(overlay);

initHelp({ overlay });

// Backend sync — non-blocking, graceful offline fallback
initSync({
  overlay,
  onPulled: () => refreshData(),
  onConflict: (winner) => console.info("[sync] conflict resolved:", winner),
});

// When search clears, re-render the grid normally.
document.addEventListener("search:cleared", () => {
  state.searchQuery = "";
  setGridState({ searchQuery: "" });
});

document.addEventListener("search:active", () => {
  state.searchQuery = document.getElementById("filter").value;
  // grid will skip rendering because of searchQuery; search.js owns the view.
});

// Expose for later phases (settings panel will call these)
export function refreshData() {
  categories = merge(seed, overlay);
  // drop orphaned favorites (links that no longer exist)
  const allIds = new Set();
  categories.forEach((c) => c.items.forEach((l) => allIds.add(l.id)));
  state.favorites = new Set(
    [...state.favorites].filter((id) => allIds.has(id)),
  );
  overlay.favorites = [...state.favorites];

  setGridData(categories);
  setSidebarData(categories, state.activeCategory);
  setSidebarFavorites(state.favorites);
  attachDnD();
  renderWeather();
  initTailscale(overlay); // re-init so probe URL change takes effect immediately
  // If a search is active, re-render the search overlay so changes appear immediately.
  if (document.getElementById("filter").value.trim()) renderSearch();
}

export function getOverlay() {
  return overlay;
}

export function persistOverlay() {
  saveOverlay(overlay);
  syncPush(); // push to backend after every local save
}

const fab = document.createElement("button");
fab.className = "fab";
fab.innerHTML = "+";
fab.title = "Add link";
fab.onclick = () => openLinkEditor({});
document.body.appendChild(fab);

// Register service worker (PWA — only on HTTPS or localhost)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.warn("[sw] registration failed:", err));
  });
}

// Mobile sidebar toggle
(function () {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (!toggle || !sidebar) return;

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  // Close on scrim click (the ::after pseudo-element)
  document.addEventListener("click", (e) => {
    if (
      document.body.classList.contains("sidebar-open") &&
      !sidebar.contains(e.target) &&
      e.target !== toggle &&
      !toggle.contains(e.target)
    ) {
      closeSidebar();
    }
  });

  // Close after a nav-item click (link navigation on mobile)
  sidebar.addEventListener("click", (e) => {
    if (e.target.closest(".nav-item, .nav-pinned-item")) {
      closeSidebar();
    }
  });
})();
