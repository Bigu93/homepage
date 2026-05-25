// js/main.js
// App entry point. Loads overlay, merges with seed, wires modules.

import seed from "./shortcuts.js";
import { load as loadOverlay, save as saveOverlay, migrateLegacyFavorites } from "./storage.js";
import { merge } from "./data.js";
import { clearExpiredFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";
import { initSidebar, setActive as setSidebarActive, setData as setSidebarData } from "./render/sidebar.js";
import { initGrid, setData as setGridData, setState as setGridState } from "./render/grid.js";
import { initSettings } from "./crud/settings.js";
import { initLinkEditor, openLinkEditor } from "./crud/link-editor.js";
import { initCategoryEditor, openCategoryEditor } from "./crud/category-editor.js";
import { initDnD, attach as attachDnD } from "./crud/dnd.js";
import { ICONS } from "./icons.js";

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
  onEditCategory: (catId) => openCategoryEditor({ categoryId: catId }),
  onAddCategory: () => openCategoryEditor({}),
});
initGrid({
  data: categories,
  state,
  onToggleFavorite: toggleFavorite,
  onEditLink: (linkId) => openLinkEditor({ linkId }),
  onAddLinkToCategory: (catId) => openLinkEditor({ defaultCategoryId: catId }),
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
  setSidebarData(categories, state.activeCategory);
  attachDnD();
}

export function getOverlay() {
  return overlay;
}

export function persistOverlay() {
  saveOverlay(overlay);
}

const fab = document.createElement("button");
fab.className = "fab";
fab.innerHTML = "+";
fab.title = "Add link";
fab.onclick = () => openLinkEditor({});
document.body.appendChild(fab);
