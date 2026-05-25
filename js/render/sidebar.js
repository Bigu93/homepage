// js/render/sidebar.js
// Renders the sidebar category list.

import { ICONS } from "../icons.js";

let dataRef = [];
let activeCategoryRef = "all";
let onSelect = null;
let onEditCb = null;
let onAddCb = null;
let favoritesRef = new Set();

export function initSidebar({ data, activeCategory, onCategorySelect, onEditCategory, onAddCategory, favorites }) {
  dataRef = data;
  activeCategoryRef = activeCategory;
  onSelect = onCategorySelect;
  onEditCb = onEditCategory;
  onAddCb = onAddCategory;
  favoritesRef = favorites || new Set();
  render();
}

export function setActive(category) {
  activeCategoryRef = category;
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((el) => {
    el.classList.remove("active");
    const isAll = category === "all" && el.dataset.cat === "all";
    const isCat = el.dataset.cat === category;
    if (isAll || isCat) el.classList.add("active");
  });
}

export function setData(data, activeCategory) {
  dataRef = data;
  if (activeCategory != null) activeCategoryRef = activeCategory;
  render();
}

export function setFavorites(favs) {
  favoritesRef = favs || new Set();
  render();
}

function render() {
  const root = document.getElementById("sidebar-categories");
  if (!root) return;
  root.innerHTML = "";

  // --- Pinned group ---
  const pinnedLinks = [];
  dataRef.forEach((cat) => {
    cat.items.forEach((l) => {
      if (favoritesRef.has(l.id)) pinnedLinks.push({ link: l, color: cat.color });
    });
  });

  if (pinnedLinks.length) {
    const heading = document.createElement("div");
    heading.className = "nav-section-label";
    heading.textContent = "Pinned";
    root.appendChild(heading);

    const pinnedWrap = document.createElement("div");
    pinnedWrap.className = "nav-pinned";
    pinnedLinks.forEach((p) => {
      const a = document.createElement("a");
      a.className = "nav-pinned-item";
      a.href = p.link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const dot = document.createElement("span");
      dot.className = `cat-dot ${p.color}`;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = p.link.name;
      a.append(dot, label);
      pinnedWrap.appendChild(a);
    });
    root.appendChild(pinnedWrap);

    const divider = document.createElement("div");
    divider.className = "nav-divider";
    root.appendChild(divider);
  }

  // --- Categories ---
  dataRef.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${activeCategoryRef === cat.category ? "active" : ""}`;
    btn.onclick = () => onSelect && onSelect(cat.category);
    btn.dataset.cat = cat.category;

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    const count = document.createElement("span");
    count.className = "nav-count";
    count.textContent = cat.items.length;

    const editBtn = document.createElement("span");
    editBtn.className = "nav-edit";
    editBtn.title = "Edit category";
    editBtn.innerHTML = ICONS.pencil;
    editBtn.onclick = (e) => {
      e.stopPropagation();
      if (onEditCb) onEditCb(cat.id);
    };

    btn.append(iconSpan, labelSpan, count, editBtn);
    root.appendChild(btn);
  });

  // "+ New category" button
  const addBtn = document.createElement("button");
  addBtn.id = "new-cat-btn";
  addBtn.className = "nav-item nav-add";
  const addIcon = document.createElement("span");
  addIcon.className = "icon";
  addIcon.innerHTML = ICONS.plus;
  const addLabel = document.createElement("span");
  addLabel.className = "label";
  addLabel.textContent = "New category";
  addBtn.append(addIcon, addLabel);
  addBtn.onclick = () => onAddCb && onAddCb();
  root.appendChild(addBtn);
}
