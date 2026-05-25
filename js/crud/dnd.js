// js/crud/dnd.js
// Drag-reorder for link cards (within + across categories) and sidebar categories.
// Desktop: native HTML5 DnD. Touch: long-press 350ms triggers, then track touchmove.

import { save as saveOverlay } from "../storage.js";

let overlayRef = null;
let onChangeCb = null;

export function initDnD({ overlay, onChange }) {
  overlayRef = overlay;
  onChangeCb = onChange;
  attach();
  // re-attach on each refresh (call attach() after rerender)
}

export function attach() {
  // Link cards
  document.querySelectorAll(".link-card").forEach((card) => {
    if (card._dndBound) return;
    card._dndBound = true;
    card.draggable = true;
    card.addEventListener("dragstart", onLinkDragStart);
    card.addEventListener("dragover", onLinkDragOver);
    card.addEventListener("drop", onLinkDrop);
    card.addEventListener("dragend", onLinkDragEnd);

    bindTouchDrag(card, "link");
  });

  // Categories in sidebar
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
    if (item._dndBound) return;
    if (item.dataset.cat === "all" || item.id === "new-cat-btn") return;
    item._dndBound = true;
    item.draggable = true;
    item.addEventListener("dragstart", onCatDragStart);
    item.addEventListener("dragover", onCatDragOver);
    item.addEventListener("drop", onCatDrop);
    item.addEventListener("dragend", onCatDragEnd);

    bindTouchDrag(item, "cat");
  });

  // Allow dropping a link onto a sidebar category to move it
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
    item.addEventListener("dragover", (e) => {
      if (window._dragKind === "link") {
        e.preventDefault();
        item.classList.add("drop-target");
      }
    });
    item.addEventListener("dragleave", () => item.classList.remove("drop-target"));
    item.addEventListener("drop", (e) => {
      if (window._dragKind !== "link") return;
      e.preventDefault();
      item.classList.remove("drop-target");
      const linkId = window._draggedLinkId;
      const targetCatLabel = item.querySelector(".label")?.textContent;
      moveLinkToCategoryByLabel(linkId, targetCatLabel);
    });
  });
}

function onLinkDragStart(e) {
  window._draggedLinkId = e.currentTarget.dataset.linkId;
  window._dragKind = "link";
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
}

function onLinkDragOver(e) {
  if (window._dragKind !== "link") return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drop-target");
}

function onLinkDrop(e) {
  if (window._dragKind !== "link") return;
  e.preventDefault();
  e.currentTarget.classList.remove("drop-target");
  const draggedId = window._draggedLinkId;
  const targetCard = e.currentTarget;
  const targetId = targetCard.dataset.linkId;
  if (draggedId === targetId) return;
  const targetSection = targetCard.closest(".category-section");
  const targetCatId = targetSection?.dataset.categoryId;
  reorderLink(draggedId, targetId, targetCatId);
}

function onLinkDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
  window._draggedLinkId = null;
  window._dragKind = null;
}

function onCatDragStart(e) {
  window._draggedCatLabel = e.currentTarget.querySelector(".label")?.textContent;
  window._dragKind = "cat";
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
}

function onCatDragOver(e) {
  if (window._dragKind !== "cat") return;
  e.preventDefault();
}

function onCatDrop(e) {
  if (window._dragKind !== "cat") return;
  e.preventDefault();
  const draggedLabel = window._draggedCatLabel;
  const targetLabel = e.currentTarget.querySelector(".label")?.textContent;
  if (draggedLabel === targetLabel) return;
  reorderCategoryByLabel(draggedLabel, targetLabel);
}

function onCatDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  window._draggedCatLabel = null;
  window._dragKind = null;
}

// --- Touch drag ---

function bindTouchDrag(el, kind) {
  let pressTimer = null;
  let dragging = false;
  let ghost = null;
  let touchStartX = 0, touchStartY = 0;
  let currentTarget = null;

  el.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    pressTimer = setTimeout(() => {
      dragging = true;
      window._dragKind = kind;
      if (kind === "link") window._draggedLinkId = el.dataset.linkId;
      if (kind === "cat") window._draggedCatLabel = el.querySelector(".label")?.textContent;
      ghost = el.cloneNode(true);
      ghost.style.position = "fixed";
      ghost.style.pointerEvents = "none";
      ghost.style.opacity = "0.8";
      ghost.style.left = t.clientX + "px";
      ghost.style.top = t.clientY + "px";
      ghost.style.zIndex = "300";
      document.body.appendChild(ghost);
      el.classList.add("dragging");
    }, 350);
  }, { passive: true });

  el.addEventListener("touchmove", (e) => {
    if (!dragging) {
      const t = e.touches[0];
      if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) {
        clearTimeout(pressTimer);
      }
      return;
    }
    e.preventDefault();
    const t = e.touches[0];
    ghost.style.left = t.clientX + "px";
    ghost.style.top = t.clientY + "px";

    // find drop target under finger
    ghost.style.display = "none";
    const under = document.elementFromPoint(t.clientX, t.clientY);
    ghost.style.display = "";
    document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    if (under) {
      const targetCard = under.closest(kind === "link" ? ".link-card" : ".nav-item");
      if (targetCard && targetCard !== el) {
        targetCard.classList.add("drop-target");
        currentTarget = targetCard;
      } else if (kind === "link") {
        const targetNav = under.closest(".nav-item");
        if (targetNav && targetNav.dataset.cat !== "all" && targetNav.id !== "new-cat-btn") {
          targetNav.classList.add("drop-target");
          currentTarget = targetNav;
        }
      }
    }
  }, { passive: false });

  el.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
    if (!dragging) return;
    dragging = false;
    if (ghost) ghost.remove();
    ghost = null;
    el.classList.remove("dragging");

    if (currentTarget) {
      currentTarget.classList.remove("drop-target");
      if (kind === "link") {
        if (currentTarget.classList.contains("link-card")) {
          const targetSection = currentTarget.closest(".category-section");
          reorderLink(window._draggedLinkId, currentTarget.dataset.linkId, targetSection?.dataset.categoryId);
        } else {
          const label = currentTarget.querySelector(".label")?.textContent;
          moveLinkToCategoryByLabel(window._draggedLinkId, label);
        }
      } else if (kind === "cat") {
        const label = currentTarget.querySelector(".label")?.textContent;
        reorderCategoryByLabel(window._draggedCatLabel, label);
      }
    }
    currentTarget = null;
    window._draggedLinkId = null;
    window._draggedCatLabel = null;
    window._dragKind = null;
  });
}

// --- State mutations ---

function reorderLink(draggedId, beforeId, targetCatId) {
  // We need to recompute the per-category order so we can persist it.
  // First, find the source category of draggedId.
  const allSections = Array.from(document.querySelectorAll(".category-section"));
  const cardOrders = new Map(); // catId → array of linkIds (current visual order)
  allSections.forEach((sec) => {
    const ids = Array.from(sec.querySelectorAll(".link-card")).map((c) => c.dataset.linkId);
    cardOrders.set(sec.dataset.categoryId, ids);
  });

  let sourceCatId = null;
  cardOrders.forEach((ids, catId) => {
    if (ids.includes(draggedId)) sourceCatId = catId;
  });
  if (!sourceCatId) return;

  // remove dragged from source
  cardOrders.set(sourceCatId, cardOrders.get(sourceCatId).filter((id) => id !== draggedId));

  // insert before beforeId in target
  const targetList = cardOrders.get(targetCatId) || [];
  const idx = targetList.indexOf(beforeId);
  if (idx === -1) targetList.push(draggedId);
  else targetList.splice(idx, 0, draggedId);
  cardOrders.set(targetCatId, targetList);

  // If cross-category move, record categoryId change in overlay.edited.links
  if (sourceCatId !== targetCatId) {
    // Is dragged an added link?
    let added = false;
    for (const cId in overlayRef.added.links) {
      const arr = overlayRef.added.links[cId];
      const i = arr.findIndex((l) => l.id === draggedId);
      if (i !== -1) {
        const [moved] = arr.splice(i, 1);
        if (!overlayRef.added.links[targetCatId]) overlayRef.added.links[targetCatId] = [];
        overlayRef.added.links[targetCatId].push(moved);
        added = true;
        break;
      }
    }
    if (!added) {
      overlayRef.edited.links[draggedId] = {
        ...(overlayRef.edited.links[draggedId] || {}),
        categoryId: targetCatId,
      };
    }
  }

  // Persist new per-category orders for the categories that changed
  if (!overlayRef.order.links) overlayRef.order.links = {};
  overlayRef.order.links[targetCatId] = cardOrders.get(targetCatId);
  if (sourceCatId !== targetCatId) {
    overlayRef.order.links[sourceCatId] = cardOrders.get(sourceCatId);
  }

  saveOverlay(overlayRef);
  if (onChangeCb) onChangeCb();
}

function moveLinkToCategoryByLabel(draggedId, targetCatLabel) {
  if (!draggedId || !targetCatLabel) return;
  // Find target catId by walking current rendered categories (via section dataset).
  let targetCatId = null;
  document.querySelectorAll(".category-section").forEach((sec) => {
    const headerName = sec.querySelector(".cat-name")?.textContent.trim();
    if (headerName === targetCatLabel) targetCatId = sec.dataset.categoryId;
  });
  if (!targetCatId) return;
  // Append at end of target
  reorderLink(draggedId, /* beforeId */ "__end__", targetCatId);
}

function reorderCategoryByLabel(draggedLabel, targetLabel) {
  const labels = Array.from(document.querySelectorAll(".sidebar-nav .nav-item .label")).map((l) => l.textContent.trim());
  // Need to map labels back to ids — we read from rendered sections (each .category-section has dataset.categoryId + .cat-name).
  const labelToId = new Map();
  document.querySelectorAll(".category-section").forEach((sec) => {
    const name = sec.querySelector(".cat-name")?.textContent.trim();
    if (name) labelToId.set(name, sec.dataset.categoryId);
  });

  // Build the current category id order from the sidebar (excluding "Overview" and "+ New").
  const orderedIds = labels
    .filter((l) => l !== "Overview" && l !== "New category")
    .map((l) => labelToId.get(l))
    .filter(Boolean);

  const draggedId = labelToId.get(draggedLabel);
  const targetId = labelToId.get(targetLabel);
  if (!draggedId || !targetId) return;

  const without = orderedIds.filter((id) => id !== draggedId);
  const idx = without.indexOf(targetId);
  without.splice(idx, 0, draggedId);

  overlayRef.order.categories = without;
  saveOverlay(overlayRef);
  if (onChangeCb) onChangeCb();
}
