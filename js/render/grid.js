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

    cat.items.forEach((item) => {
      grid.appendChild(renderLinkCard(item));
    });

    section.append(header, grid);
    root.appendChild(section);
  });
}

function renderSearchResults(root, query) {
  const matches = [];
  dataRef.forEach((cat) => {
    cat.items.forEach((item) => {
      if (
        item.name.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
      ) {
        matches.push(item);
      }
    });
  });
  if (matches.length === 0) {
    root.innerHTML = `<div class="empty-state">No results found for "${stateRef.searchQuery}"</div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid-view";
  matches.forEach((m) => grid.appendChild(renderLinkCard(m)));
  root.appendChild(grid);
}

function renderLinkCard(item) {
  const card = document.createElement("a");
  card.href = item.url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.dataset.linkId = item.id;

  const faviconWrap = document.createElement("div");
  faviconWrap.className = "link-favicon";
  const icon = document.createElement("img");
  icon.src = getFavicon(item.url);
  icon.loading = "lazy";
  icon.alt = "";
  icon.onerror = () => {
    faviconWrap.innerHTML = "";
    const letter = document.createElement("span");
    letter.textContent = (item.name[0] || "?").toUpperCase();
    letter.style.color = "var(--text-main)";
    letter.style.fontWeight = "600";
    letter.style.fontSize = "12px";
    faviconWrap.appendChild(letter);
  };
  faviconWrap.appendChild(icon);

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = item.name;
  title.title = item.name;

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(item.id) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(item.id);
  };

  card.append(faviconWrap, title, favBtn);
  return card;
}
