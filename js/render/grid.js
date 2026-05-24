// js/render/grid.js
// Renders the main content area: link cards grouped by category, or filtered search results.

import { ICONS } from "../icons.js";
import { getFavicon } from "../favicons.js";

let dataRef = [];
let stateRef = null; // { activeCategory, searchQuery, favorites: Set }
let onFavoriteToggle = null;

export function initGrid({ data, state, onToggleFavorite }) {
  dataRef = data;
  stateRef = state;
  onFavoriteToggle = onToggleFavorite;
  render();
}

export function setData(data) {
  dataRef = data;
  render();
}

export function setState(partial) {
  Object.assign(stateRef, partial);
  render();
}

function render() {
  const root = document.getElementById("view-container");
  if (!root) return;
  root.innerHTML = "";
  const query = (stateRef.searchQuery || "").toLowerCase();

  if (query) {
    renderSearchResults(root, query);
    return;
  }

  const filtered =
    stateRef.activeCategory === "all"
      ? dataRef
      : dataRef.filter((c) => c.category === stateRef.activeCategory);

  filtered.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";

    const header = document.createElement("h2");
    header.className = `category-header ${cat.color}`;
    header.innerHTML = `<span class="cat-dot"></span>${cat.category}`;

    const grid = document.createElement("div");
    grid.className = "grid-view";

    Object.entries(cat.items).forEach(([name, url]) => {
      grid.appendChild(renderLinkCard(name, url));
    });

    section.append(header, grid);
    root.appendChild(section);
  });
}

function renderSearchResults(root, query) {
  const matches = [];
  dataRef.forEach((cat) => {
    Object.entries(cat.items).forEach(([name, url]) => {
      if (name.toLowerCase().includes(query) || url.toLowerCase().includes(query)) {
        matches.push({ name, url });
      }
    });
  });
  if (matches.length === 0) {
    root.innerHTML = `<div class="empty-state">No results found for "${stateRef.searchQuery}"</div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid-view";
  matches.forEach((m) => grid.appendChild(renderLinkCard(m.name, m.url)));
  root.appendChild(grid);
}

function renderLinkCard(name, url) {
  const card = document.createElement("a");
  card.href = url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const icon = document.createElement("img");
  icon.src = getFavicon(url);
  icon.loading = "lazy";

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = name;

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(url) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(url);
  };

  card.append(icon, title, favBtn);
  return card;
}
