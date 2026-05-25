// js/render/grid.js
// Renders the main content area: link cards grouped by category, or filtered search results.

import { ICONS } from "../icons.js";
import { getFavicon } from "../favicons.js";

let dataRef = [];
let stateRef = null; // { activeCategory, searchQuery, favorites: Set }
let onFavoriteToggle = null;
let onEditCb = null;
let onAddToCatCb = null;
let onEditCategoryCb = null;

export function initGrid({
  data,
  state,
  onToggleFavorite,
  onEditLink,
  onAddLinkToCategory,
  onEditCategory,
}) {
  dataRef = data;
  stateRef = state;
  onFavoriteToggle = onToggleFavorite;
  onEditCb = onEditLink;
  onAddToCatCb = onAddLinkToCategory;
  onEditCategoryCb = onEditCategory;
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
  // Search overlay is owned by search.js. Only render grid when no query.
  if (stateRef.searchQuery && stateRef.searchQuery.trim()) return;
  root.innerHTML = "";

  const filtered =
    stateRef.activeCategory === "all"
      ? dataRef
      : dataRef.filter((c) => c.category === stateRef.activeCategory);

  filtered.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";
    section.dataset.categoryId = cat.id;

    const header = document.createElement("h2");
    header.className = `category-header ${cat.color}`;
    const catDot = document.createElement("span");
    catDot.className = "cat-dot";
    const catName = document.createElement("span");
    catName.className = "cat-name";
    catName.textContent = cat.category;
    header.append(catDot, catName);

    const addToCatBtn = document.createElement("button");
    addToCatBtn.className = "cat-add-btn";
    addToCatBtn.innerHTML = ICONS.plus;
    addToCatBtn.title = "Add link to this category";
    addToCatBtn.onclick = () => onAddToCatCb && onAddToCatCb(cat.id);
    header.appendChild(addToCatBtn);

    const editCatBtn = document.createElement("button");
    editCatBtn.className = "cat-add-btn cat-edit-btn";
    editCatBtn.innerHTML = ICONS.pencil;
    editCatBtn.title = "Edit category";
    editCatBtn.onclick = () => onEditCategoryCb && onEditCategoryCb(cat.id);
    header.appendChild(editCatBtn);

    const grid = document.createElement("div");
    grid.className = "grid-view";

    if (cat.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-cat";
      empty.innerHTML = `No links yet. <button class="btn btn-ghost" type="button">+ Add your first link</button>`;
      empty.querySelector("button").onclick = () =>
        onAddToCatCb && onAddToCatCb(cat.id);
      section.append(header, empty);
    } else {
      cat.items.forEach((item) => grid.appendChild(renderLinkCard(item)));
      section.append(header, grid);
    }

    root.appendChild(section);
  });
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

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.title = "Edit";
  editBtn.innerHTML = ICONS.pencil;
  editBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditCb) onEditCb(item.id);
  };

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(item.id) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(item.id);
  };

  card.append(faviconWrap, title, editBtn, favBtn);
  return card;
}
