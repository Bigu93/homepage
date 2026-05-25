// js/render/sidebar.js
// Renders the sidebar category list.

import { ICONS } from "../icons.js";

let dataRef = [];
let activeCategoryRef = "all";
let onSelect = null;
let onEditCb = null;
let onAddCb = null;

export function initSidebar({ data, activeCategory, onCategorySelect, onEditCategory, onAddCategory }) {
  dataRef = data;
  activeCategoryRef = activeCategory;
  onSelect = onCategorySelect;
  onEditCb = onEditCategory;
  onAddCb = onAddCategory;
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

function render() {
  const root = document.getElementById("sidebar-categories");
  if (!root) return;
  root.innerHTML = "";
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
  addBtn.innerHTML = `<span class="icon">${ICONS.plus}</span><span class="label">New category</span>`;
  addBtn.onclick = () => onAddCb && onAddCb();
  root.appendChild(addBtn);
}
