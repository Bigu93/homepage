// js/crud/category-editor.js
// Add / edit / delete a category.

import { openModal, closeModal, confirmDialog, toast } from "./modal.js";
import { save as saveOverlay } from "../storage.js";
import { ICONS } from "../icons.js";

const COLORS = ["yellow", "cyan", "blue", "red", "green", "purple", "light-gray", "gray", "black"];
const ICON_KEYS = [
  "home", "code", "graduation-cap", "cpu", "terminal", "briefcase",
  "gamepad-2", "newspaper", "shopping-cart", "joystick", "star",
  "server", "flag", "shield", "activity", "book",
];

let overlayRef = null;
let categoriesRef = [];
let onChangeCb = null;

export function initCategoryEditor({ overlay, getCategories, onChange }) {
  overlayRef = overlay;
  categoriesRef = getCategories();
  onChangeCb = () => {
    categoriesRef = getCategories();
    if (onChange) onChange();
  };
}

function persist() {
  saveOverlay(overlayRef);
  onChangeCb();
}

function makeCatId(name) {
  const slug = (name || "category")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `cat-user-${slug}-${Date.now().toString(36)}`;
}

export function openCategoryEditor({ categoryId = null } = {}) {
  const isEdit = !!categoryId;
  let existing = null;
  if (isEdit) {
    existing = categoriesRef.find((c) => c.id === categoryId);
    if (!existing) {
      toast("Category not found.", "error");
      return;
    }
  }

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="field">
      <label>Name</label>
      <input id="cat-name" type="text" maxlength="40" required>
      <div class="error" id="cat-name-err" style="display:none">Name is required.</div>
    </div>
    <div class="field">
      <label>Color</label>
      <div id="cat-colors" class="swatch-grid"></div>
    </div>
    <div class="field">
      <label>Icon</label>
      <div id="cat-icons" class="icon-grid"></div>
    </div>
  `;

  const nameI = body.querySelector("#cat-name");
  const colorRoot = body.querySelector("#cat-colors");
  const iconRoot = body.querySelector("#cat-icons");
  const nameErr = body.querySelector("#cat-name-err");

  let selectedColor = existing?.color || "blue";
  let selectedIcon = existing?.icon || "home";

  COLORS.forEach((c) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = `swatch ${c} ${c === selectedColor ? "selected" : ""}`;
    sw.dataset.color = c;
    sw.title = c;
    sw.onclick = () => {
      selectedColor = c;
      colorRoot.querySelectorAll(".swatch").forEach((el) => el.classList.toggle("selected", el.dataset.color === c));
    };
    colorRoot.appendChild(sw);
  });

  ICON_KEYS.forEach((k) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `icon-cell ${k === selectedIcon ? "selected" : ""}`;
    btn.dataset.icon = k;
    btn.innerHTML = ICONS[k];
    btn.title = k;
    btn.onclick = () => {
      selectedIcon = k;
      iconRoot.querySelectorAll(".icon-cell").forEach((el) => el.classList.toggle("selected", el.dataset.icon === k));
    };
    iconRoot.appendChild(btn);
  });

  if (isEdit) nameI.value = existing.category;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "space-between";
  footer.style.gap = "0.5rem";

  const leftGroup = document.createElement("div");
  if (isEdit) {
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Delete category";
    delBtn.onclick = async () => {
      const ok = await confirmDialog({
        title: "Delete category",
        message: `Delete “${existing.category}” and all its links?`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
      deleteCategory(existing.id);
      closeModal();
      toast("Category deleted.", "success");
    };
    leftGroup.appendChild(delBtn);
  }

  const rightGroup = document.createElement("div");
  rightGroup.style.display = "flex";
  rightGroup.style.gap = "0.5rem";
  const cancel = document.createElement("button");
  cancel.className = "btn";
  cancel.textContent = "Cancel";
  cancel.onclick = closeModal;
  const save = document.createElement("button");
  save.className = "btn btn-primary";
  save.textContent = isEdit ? "Save" : "Add category";
  save.onclick = () => {
    const name = nameI.value.trim();
    nameErr.style.display = "none";
    nameI.classList.remove("invalid");
    if (!name) {
      nameErr.style.display = "block";
      nameI.classList.add("invalid");
      return;
    }
    if (isEdit) {
      editCategory(existing.id, { category: name, color: selectedColor, icon: selectedIcon });
    } else {
      addCategory({
        id: makeCatId(name),
        category: name,
        color: selectedColor,
        icon: selectedIcon,
        items: [],
      });
    }
    closeModal();
    toast(isEdit ? "Saved." : "Category added.", "success");
  };
  rightGroup.append(cancel, save);

  footer.append(leftGroup, rightGroup);
  openModal({ title: isEdit ? "Edit category" : "New category", body, footer, width: "480px" });
}

function addCategory(cat) {
  overlayRef.added.categories.push(cat);
  persist();
}

function editCategory(catId, patch) {
  // If added: mutate directly
  const idx = overlayRef.added.categories.findIndex((c) => c.id === catId);
  if (idx !== -1) {
    Object.assign(overlayRef.added.categories[idx], patch);
    persist();
    return;
  }
  overlayRef.edited.categories[catId] = { ...(overlayRef.edited.categories[catId] || {}), ...patch };
  persist();
}

function deleteCategory(catId) {
  const idx = overlayRef.added.categories.findIndex((c) => c.id === catId);
  if (idx !== -1) {
    // also drop any added.links for this category
    delete overlayRef.added.links[catId];
    overlayRef.added.categories.splice(idx, 1);
  } else {
    if (!overlayRef.deleted.categories.includes(catId)) {
      overlayRef.deleted.categories.push(catId);
    }
    delete overlayRef.edited.categories[catId];
  }
  // also remove from order
  overlayRef.order.categories = (overlayRef.order.categories || []).filter((id) => id !== catId);
  delete overlayRef.order.links?.[catId];
  persist();
}
