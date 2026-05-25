// js/stats.js
// Click-count tracking for the "Frequent" sidebar group.

import { save as saveOverlay } from "./storage.js";

let overlayRef = null;
let saveTimer = null;
const MAX_COUNT = 9999;
const SAVE_DEBOUNCE_MS = 500;

export function initStats(overlay) {
  overlayRef = overlay;
  if (!overlayRef.clickCounts) overlayRef.clickCounts = {};
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveOverlay(overlayRef);
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

export function recordClick(linkId) {
  if (!overlayRef || !linkId) return;
  const cur = overlayRef.clickCounts[linkId] || 0;
  if (cur >= MAX_COUNT) return;
  overlayRef.clickCounts[linkId] = cur + 1;
  scheduleSave();
}

export function topLinks(merged, n = 6) {
  if (!overlayRef) return [];
  const counts = overlayRef.clickCounts || {};
  const idToLink = new Map();
  merged.forEach((cat) =>
    cat.items.forEach((l) => idToLink.set(l.id, { link: l, color: cat.color })),
  );
  const ranked = [];
  for (const [id, c] of Object.entries(counts)) {
    if (c < 2) continue;
    const entry = idToLink.get(id);
    if (!entry) continue;
    ranked.push({ ...entry, count: c });
  }
  ranked.sort(
    (a, b) => b.count - a.count || a.link.name.localeCompare(b.link.name),
  );
  return ranked.slice(0, n);
}

export function clearStats() {
  if (!overlayRef) return;
  overlayRef.clickCounts = {};
  saveOverlay(overlayRef);
}
