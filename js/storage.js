// js/storage.js
// Reads + writes the overlay (user diff over seed). Schema-versioned + migrations.

const KEY = "startpage_overlay_v1";
const CURRENT_SCHEMA = 1;

const EMPTY_OVERLAY = {
  schemaVersion: CURRENT_SCHEMA,
  added: { categories: [], links: {} },
  edited: { categories: {}, links: {} },
  deleted: { categories: [], links: [] },
  order: { categories: [], links: {} },
  favorites: [],
  settings: {
    theme: undefined, // theme.js owns its own key for backwards compat
    defaultEngine: "ddg",
    customEngines: [],
    weather: null,
    username: "Marcin",
    helpDismissed: false,
  },
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function load() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    console.warn("[storage] read failed:", e);
    return clone(EMPTY_OVERLAY);
  }
  if (!raw) return clone(EMPTY_OVERLAY);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn("[storage] parse failed:", e);
    return clone(EMPTY_OVERLAY);
  }
  return migrate(parsed);
}

export function save(overlay) {
  try {
    localStorage.setItem(KEY, JSON.stringify(overlay));
    return true;
  } catch (e) {
    console.warn("[storage] write failed:", e);
    return false;
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("[storage] reset failed:", e);
  }
}

function migrate(overlay) {
  // From legacy `favorites` URL set, map to link ids — needs seed lookup, done in main.js
  // Here we just normalize structure.
  if (!overlay.schemaVersion) overlay.schemaVersion = 1;
  if (overlay.schemaVersion > CURRENT_SCHEMA) {
    const ok = confirm(
      "Your saved settings were created by a newer version of this app. Reset to defaults? (Cancel to keep them, the app may misbehave.)",
    );
    if (ok) {
      reset();
      return clone(EMPTY_OVERLAY);
    }
  }
  // Fill missing keys defensively.
  const merged = clone(EMPTY_OVERLAY);
  for (const k of Object.keys(merged)) {
    if (k === "settings") {
      merged.settings = { ...merged.settings, ...(overlay.settings || {}) };
    } else if (overlay[k] !== undefined) {
      merged[k] = overlay[k];
    }
  }
  merged.schemaVersion = CURRENT_SCHEMA;
  return merged;
}

export function migrateLegacyFavorites(overlay, seed) {
  // Read legacy `favorites` URL set, map URLs to link ids using seed.
  let raw;
  try {
    raw = localStorage.getItem("favorites");
  } catch {
    return overlay;
  }
  if (!raw) return overlay;
  let urls;
  try {
    urls = JSON.parse(raw);
  } catch {
    return overlay;
  }
  if (!Array.isArray(urls) || urls.length === 0) return overlay;
  const urlToId = new Map();
  seed.forEach((cat) =>
    cat.items.forEach((it) => urlToId.set(it.url, it.id)),
  );
  const ids = urls.map((u) => urlToId.get(u)).filter(Boolean);
  overlay.favorites = Array.from(new Set([...(overlay.favorites || []), ...ids]));
  try {
    localStorage.removeItem("favorites");
  } catch {
    /* ignore */
  }
  return overlay;
}
