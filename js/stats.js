// js/stats.js
// Click-count tracking for the "Frequent" sidebar group.
// Backend mode: batches events to POST /api/v1/clicks, reads GET /api/v1/stats/frequent.
// Offline / no backend: uses local overlay.clickCounts as before.

import { save as saveOverlay } from "./storage.js";
import { apiFetch } from "./api.js";

let overlayRef = null;
let saveTimer = null;
const MAX_COUNT = 9999;
const SAVE_DEBOUNCE_MS = 500;

// Backend batch queue
const _queue = []; // { linkId, ts }
let _flushTimer = null;
const FLUSH_INTERVAL_MS = 30_000;

// topLinks cache (backend result)
let _cachedFrequent = null; // [{ link_id, count }]
let _cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export function initStats(overlay) {
  overlayRef = overlay;
  if (!overlayRef.clickCounts) overlayRef.clickCounts = {};

  // Start periodic flush if backend enabled
  if (_backendEnabled()) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) _flushQueue();
    });
  }
}

function _backendEnabled() {
  const sync = overlayRef?.settings?.sync;
  return !!(sync?.enabled && sync?.baseUrl && sync?.token);
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

  // Always update local counts (offline fallback)
  const cur = overlayRef.clickCounts[linkId] || 0;
  if (cur < MAX_COUNT) {
    overlayRef.clickCounts[linkId] = cur + 1;
    scheduleSave();
  }

  // Enqueue for backend
  if (_backendEnabled()) {
    _queue.push({ link_id: linkId, ts: Date.now() });
    _scheduleFlush();
  }
}

function _scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    _flushQueue();
  }, FLUSH_INTERVAL_MS);
}

async function _flushQueue() {
  if (!_queue.length || !_backendEnabled()) return;
  const batch = _queue.splice(0, 500); // max 500 per request
  try {
    const sync = overlayRef.settings.sync;
    await apiFetch(sync, "/api/v1/clicks", {
      method: "POST",
      body: JSON.stringify({
        events: batch,
        device_id: sync.deviceId || "unknown",
      }),
    });
    // Invalidate cache so next topLinks() re-fetches
    _cachedFrequent = null;
  } catch {
    // Network error — put events back at the front
    _queue.unshift(...batch);
  }
}

export async function topLinks(merged, n = 6) {
  if (!overlayRef) return [];

  // Backend path
  if (_backendEnabled()) {
    if (_cachedFrequent && Date.now() - _cachedAt < CACHE_TTL_MS) {
      return _resolveLinks(_cachedFrequent, merged, n);
    }
    try {
      const sync = overlayRef.settings.sync;
      const resp = await apiFetch(sync, `/api/v1/stats/frequent?n=${n}`, {
        method: "GET",
      });
      if (resp.ok) {
        _cachedFrequent = await resp.json(); // [{ link_id, count }]
        _cachedAt = Date.now();
        return _resolveLinks(_cachedFrequent, merged, n);
      }
    } catch {
      // Fall through to local
    }
  }

  // Local fallback
  return _topLinksLocal(merged, n);
}

function _resolveLinks(frequent, merged, n) {
  const idToLink = new Map();
  merged.forEach((cat) =>
    cat.items.forEach((l) => idToLink.set(l.id, { link: l, color: cat.color })),
  );
  return frequent
    .slice(0, n)
    .map(({ link_id, count }) => {
      const entry = idToLink.get(link_id);
      return entry ? { ...entry, count } : null;
    })
    .filter(Boolean);
}

function _topLinksLocal(merged, n) {
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

export async function clearStats() {
  if (!overlayRef) return;
  overlayRef.clickCounts = {};
  saveOverlay(overlayRef);
  _cachedFrequent = null;
  _queue.length = 0;

  if (_backendEnabled()) {
    try {
      const sync = overlayRef.settings.sync;
      await apiFetch(sync, "/api/v1/stats", { method: "DELETE" });
    } catch {
      // Best-effort
    }
  }
}
