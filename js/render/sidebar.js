// js/render/sidebar.js
// Renders the sidebar category list.

import { ICONS } from "../icons.js";

let dataRef = [];
let activeCategoryRef = "all";
let onSelect = null;

export function initSidebar({ data, activeCategory, onCategorySelect }) {
  dataRef = data;
  activeCategoryRef = activeCategory;
  onSelect = onCategorySelect;
  render();
}

export function setActive(category) {
  activeCategoryRef = category;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    const isAll = category === "all" && el.dataset.cat === "all";
    const isCat = el.textContent.trim() === category;
    if (isAll || isCat) el.classList.add("active");
  });
}

export function setData(data, activeCategory) {
  dataRef = data;
  if (activeCategory != null) activeCategoryRef = activeCategory;
  render();
}

function render() {
  const root = document.getElementById("sidebar-categories");
  if (!root) return;
  root.innerHTML = "";
  dataRef.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${activeCategoryRef === cat.category ? "active" : ""}`;
    btn.onclick = () => onSelect && onSelect(cat.category);

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    btn.append(iconSpan, labelSpan);
    root.appendChild(btn);
  });
}
