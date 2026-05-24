import data from "./shortcuts.js";
import { clearExpiredFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";
import { initSidebar, setActive as setSidebarActive } from "./render/sidebar.js";
import { initGrid, setState as setGridState } from "./render/grid.js";

/* =========================
   State
========================= */
const state = {
  activeCategory: "all",
  searchQuery: "",
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
};

/* =========================
   Init
========================= */
clearExpiredFavicons();
startClock("Marcin");
initTheme();

function selectCategory(cat) {
  state.activeCategory = cat;
  setSidebarActive(cat);
  setGridState({ activeCategory: cat });
}

function toggleFavorite(url) {
  if (state.favorites.has(url)) state.favorites.delete(url);
  else state.favorites.add(url);
  localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
  setGridState({}); // re-render with updated favorites
}

initSidebar({ data, activeCategory: state.activeCategory, onCategorySelect: selectCategory });
initGrid({ data, state, onToggleFavorite: toggleFavorite });

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
