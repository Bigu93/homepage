// js/main.js
// App entry point. Loads overlay, merges with seed, wires modules.

import seed from "./shortcuts.js";
import { load as loadOverlay, save as saveOverlay, migrateLegacyFavorites } from "./storage.js";
import { merge } from "./data.js";
import { clearExpiredFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";
import { initSidebar, setActive as setSidebarActive } from "./render/sidebar.js";
import { initGrid, setData as setGridData, setState as setGridState } from "./render/grid.js";

let overlay = loadOverlay();
overlay = migrateLegacyFavorites(overlay, seed);
saveOverlay(overlay);

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
}

clearExpiredFavicons();
initTheme();
startClock(overlay.settings?.username || "Marcin");
initSidebar({
  data: categories,
  activeCategory: state.activeCategory,
  onCategorySelect: selectCategory,
});
initGrid({
  data: categories,
  state,
  onToggleFavorite: toggleFavorite,
});

document.querySelector('[data-cat="all"]').onclick = () => selectCategory("all");

const filterInput = document.getElementById("filter");
filterInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  setGridState({ searchQuery: state.searchQuery });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== filterInput) {
    e.preventDefault();
    filterInput.focus();
  }
});

// Expose for later phases (settings panel will call these)
export function refreshData() {
  categories = merge(seed, overlay);
  setGridData(categories);
}

export function getOverlay() {
  return overlay;
}

export function persistOverlay() {
  saveOverlay(overlay);
}
