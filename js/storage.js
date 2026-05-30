// js/storage.js
// Reads + writes the overlay (user diff over seed). Schema-versioned + migrations.

const KEY = "startpage_overlay_v1";
const CURRENT_SCHEMA = 3;

const EMPTY_OVERLAY = {
  schemaVersion: CURRENT_SCHEMA,
  added: { categories: [], links: {} },
  edited: { categories: {}, links: {} },
  deleted: { categories: [], links: [] },
  order: { categories: [], links: {} },
  favorites: [],
  clickCounts: {},
  settings: {
    theme: undefined, // theme.js owns its own key for backwards compat
    defaultEngine: "ddg",
    customEngines: [],
    weather: null,
    username: "Marcin",
    helpDismissed: false,
    tailscaleProbeUrl: "",
    // v3: backend sync (device-local — never synced to server)
    sync: {
      enabled: false,
      baseUrl: "",
      token: "",
      deviceId: "",
      lastRevision: 0,
      lastSyncAt: null,
    },
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

export function normalize(overlay) {
  return migrate(overlay);
}

export function save(overlay, options = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(overlay));
    if (!options.silent && typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("overlay:saved"));
    }
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
  // v1 → v2: introduce clickCounts
  if (overlay.schemaVersion < 2) {
    overlay.clickCounts = overlay.clickCounts || {};
    overlay.schemaVersion = 2;
  }
  // v2 → v3: introduce settings.sync (device-local, never sent to server)
  if (overlay.schemaVersion < 3) {
    if (!overlay.settings) overlay.settings = {};
    if (!overlay.settings.sync) {
      overlay.settings.sync = {
        enabled: false,
        baseUrl: "",
        token: "",
        deviceId: crypto.randomUUID(),
        lastRevision: 0,
        lastSyncAt: null,
      };
    } else if (!overlay.settings.sync.deviceId) {
      overlay.settings.sync.deviceId = crypto.randomUUID();
    }
    overlay.schemaVersion = 3;
  }
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
  seed.forEach((cat) => cat.items.forEach((it) => urlToId.set(it.url, it.id)));
  const ids = urls.map((u) => urlToId.get(u)).filter(Boolean);
  overlay.favorites = Array.from(
    new Set([...(overlay.favorites || []), ...ids]),
  );
  try {
    localStorage.removeItem("favorites");
  } catch {
    /* ignore */
  }
  return overlay;
}
