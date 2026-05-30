// js/sync.js
// Cross-device overlay sync via the backend API.
// Offline-first: reads/writes localStorage, pushes/pulls opportunistically.

import { save as saveOverlay } from "./storage.js";
import { apiFetch, NetError, AuthError, ConflictError } from "./api.js";

// Keys excluded from the payload sent to / received from the server.
// These stay device-local and are never overwritten by a pull.
const LOCAL_ONLY_PATHS = ["settings.sync", "settings.theme"];

let _overlay = null;
let _onPulled = null;
let _onConflict = null;
let _pollTimer = null;

const POLL_FOCUSED_MS = 60_000;
const POLL_HIDDEN_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init({ overlay, onPulled, onConflict }) {
  _overlay = overlay;
  _onPulled = onPulled;
  _onConflict = onConflict;

  if (!_syncEnabled()) return;

  // Ensure deviceId is set
  if (!_overlay.settings.sync.deviceId) {
    _overlay.settings.sync.deviceId = crypto.randomUUID();
    saveOverlay(_overlay, { silent: true });
  }

  pull(); // immediate pull on load
  _schedulePoll();

  document.addEventListener("visibilitychange", _onVisibility);
}

export function destroy() {
  clearTimeout(_pollTimer);
  document.removeEventListener("visibilitychange", _onVisibility);
}

/** Call after every local save to trigger a push. */
export async function push() {
  if (!_syncEnabled()) return;
  try {
    await _push();
  } catch (e) {
    _log("push error", e);
  }
}

export async function pull() {
  if (!_syncEnabled()) return;
  try {
    await _pull();
  } catch (e) {
    _log("pull error", e);
  }
}

/** Test connectivity — returns { ok, status, message }. */
export async function testConnection(sync) {
  try {
    const resp = await apiFetch(sync, "/healthz", { method: "GET" });
    if (resp.ok) return { ok: true, message: "Connected" };
    return { ok: false, message: `HTTP ${resp.status}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _syncEnabled() {
  return _overlay?.settings?.sync?.enabled && _overlay?.settings?.sync?.baseUrl;
}

async function _pull() {
  const sync = _overlay.settings.sync;
  const resp = await apiFetch(sync, "/api/v1/sync", { method: "GET" });

  if (resp.status === 204) return; // no overlay on server yet

  const data = await resp.json();
  if (data.revision <= sync.lastRevision) return; // already up-to-date

  const serverOverlay = data.overlay;
  // Merge: server overlay wins for all keys except LOCAL_ONLY_PATHS
  const localOnly = _extractLocalOnly(_overlay);
  Object.assign(_overlay, serverOverlay);
  _restoreLocalOnly(_overlay, localOnly);

  _overlay.settings.sync.lastRevision = data.revision;
  _overlay.settings.sync.lastSyncAt = Date.now();
  saveOverlay(_overlay, { silent: true });

  _log("pulled revision", data.revision);
  _onPulled?.();
}

async function _push() {
  const sync = _overlay.settings.sync;
  const payload = _stripLocalOnly(_overlay);

  let resp;
  try {
    resp = await apiFetch(sync, "/api/v1/sync", {
      method: "PUT",
      body: JSON.stringify({
        overlay: payload,
        client_mtime: Date.now(),
        base_revision: sync.lastRevision,
      }),
    });
  } catch (e) {
    if (e instanceof ConflictError) {
      await _resolveConflict(e.body);
      return;
    }
    throw e;
  }

  const data = await resp.json();
  if (data.accepted) {
    _overlay.settings.sync.lastRevision = data.revision;
    _overlay.settings.sync.lastSyncAt = Date.now();
    saveOverlay(_overlay, { silent: true });
    _log("pushed revision", data.revision);
  }
}

async function _resolveConflict(serverData) {
  // LWW: compare clientMtime vs serverMtime, newer wins.
  const localMtime = _overlay.settings.sync.lastSyncAt || 0;
  const serverMtime = serverData.server_mtime || 0;

  _log("conflict — local mtime", localMtime, "server mtime", serverMtime);

  if (serverMtime >= localMtime) {
    // Server is newer — accept server overlay, update local
    const localOnly = _extractLocalOnly(_overlay);
    Object.assign(_overlay, serverData.overlay);
    _restoreLocalOnly(_overlay, localOnly);
    _overlay.settings.sync.lastRevision = serverData.server_revision;
    _overlay.settings.sync.lastSyncAt = Date.now();
    saveOverlay(_overlay, { silent: true });
    _onConflict?.("server_won");
    _onPulled?.();
    _log("conflict resolved: server won");
  } else {
    // Local is newer — re-push with updated base_revision
    _overlay.settings.sync.lastRevision = serverData.server_revision;
    saveOverlay(_overlay, { silent: true });
    _log("conflict resolved: local won, re-pushing");
    await _push();
  }
}

// ---------------------------------------------------------------------------
// LOCAL_ONLY extraction helpers
// ---------------------------------------------------------------------------

function _extractLocalOnly(overlay) {
  return {
    sync: structuredClone(overlay.settings?.sync),
    theme: overlay.settings?.theme,
  };
}

function _restoreLocalOnly(overlay, saved) {
  if (!overlay.settings) overlay.settings = {};
  overlay.settings.sync = saved.sync;
  overlay.settings.theme = saved.theme;
}

function _stripLocalOnly(overlay) {
  const copy = structuredClone(overlay);
  if (copy.settings) {
    delete copy.settings.sync;
    delete copy.settings.theme;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

function _schedulePoll() {
  clearTimeout(_pollTimer);
  const ms = document.hidden ? POLL_HIDDEN_MS : POLL_FOCUSED_MS;
  _pollTimer = setTimeout(async () => {
    await pull();
    _schedulePoll();
  }, ms);
}

function _onVisibility() {
  _schedulePoll(); // resets to correct interval on tab focus/blur
  if (!document.hidden) pull(); // pull immediately when tab becomes visible
}

function _log(...args) {
  console.debug("[sync]", ...args);
}
