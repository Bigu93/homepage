// js/tailscale.js
// Tailscale up/down indicator.
//
// Priority order:
//   1. Backend mode (sync enabled) — GET /api/v1/tailscale/status via backend.
//      Definitive: server runs tailscale status CLI. No browser mixed-content issue.
//   2. Custom probe URL (HTTPS pages without backend) — any HTTPS tailnet endpoint.
//   3. MagicDNS direct probe (HTTP / file:// pages).

import { apiFetch } from "./api.js";

const MAGIC_DNS_URL = "http://100.100.100.100/";
const PROBE_TIMEOUT_MS = 1500;
const INTERVAL_MS = 30000;

let chipEl = null;
let dotEl = null;
let inFlight = false;
let overlayRef = null;
let _intervalId = null;

export function initTailscale(overlay) {
  overlayRef = overlay;
  chipEl = document.getElementById("tailscale-chip");
  if (!chipEl) return;
  dotEl = chipEl.querySelector(".status-dot");

  // Clear any previous interval (called on refreshData)
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  // Clone listener-safe: remove old click by replacing node is overkill;
  // use a flag on chipEl instead.
  chipEl.onclick = () => {
    if (!inFlight) runProbe();
  };

  // Backend mode: server handles the probe authoritatively.
  if (_backendEnabled()) {
    paint("unknown");
    runProbe();
    _intervalId = setInterval(runProbe, INTERVAL_MS);
    return;
  }

  // Legacy browser-only path
  const useCustom = location.protocol === "https:";
  const customUrl = overlayRef?.settings?.tailscaleProbeUrl?.trim();

  if (useCustom && !customUrl) {
    paint("configure");
    return;
  }

  paint("unknown");
  runProbe();
  _intervalId = setInterval(runProbe, INTERVAL_MS);
}

function _backendEnabled() {
  const sync = overlayRef?.settings?.sync;
  return !!(sync?.enabled && sync?.baseUrl && sync?.token);
}

function probeUrl() {
  const custom = overlayRef?.settings?.tailscaleProbeUrl?.trim();
  return custom || MAGIC_DNS_URL;
}

function makeTimeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

async function probeBackend() {
  try {
    const sync = overlayRef.settings.sync;
    const resp = await apiFetch(sync, "/api/v1/tailscale/status", {
      method: "GET",
    });
    if (!resp.ok) return { state: "off", source: "backend" };
    const data = await resp.json();
    const on = data?.self?.online === true;
    return { state: on ? "on" : "off", source: "backend" };
  } catch {
    // Backend unreachable — fall back to direct probe
    return null;
  }
}

async function probeDirect() {
  const url = probeUrl();
  try {
    await fetch(url, {
      mode: "no-cors",
      signal: makeTimeoutSignal(PROBE_TIMEOUT_MS),
    });
    return { state: "on", source: url };
  } catch {
    return { state: "off", source: url };
  }
}

async function runProbe() {
  if (inFlight) return;
  inFlight = true;
  paint("checking");

  let result = null;
  if (_backendEnabled()) {
    result = await probeBackend();
  }
  // Fall back to direct probe if backend returned null (unreachable)
  if (!result) {
    result = await probeDirect();
  }

  inFlight = false;
  paint(result.state, result.source);
}

function paint(state, source) {
  if (!chipEl || !dotEl) return;
  chipEl.dataset.state = state;
  dotEl.className = `status-dot status-dot-${state}`;
  let title;
  const now = new Date().toLocaleTimeString();
  const via = source === "backend" ? "backend" : source || probeUrl();
  if (state === "on") {
    title = `Tailscale up — checked ${now} (${via})`;
  } else if (state === "off") {
    title = `Tailscale down — checked ${now} (${via})`;
  } else if (state === "checking") {
    title = "Checking Tailscale…";
  } else if (state === "configure") {
    title =
      "Tailscale: set a probe URL in Settings → Tailscale. Enter any HTTPS URL on your tailnet (NAS, Proxmox, Home Assistant, etc.).";
  } else {
    title = "Tailscale — not checked yet";
  }
  chipEl.title = title;
}
