// js/tailscale.js
// Tailscale up/down indicator.
// On HTTP/file: probes MagicDNS http://100.100.100.100/ directly.
// On HTTPS: MagicDNS is blocked by mixed-content policy; uses a user-supplied
// custom probe URL (any HTTPS endpoint on the tailnet — NAS, router, HA, etc.)
// stored in overlay.settings.tailscaleProbeUrl.

const MAGIC_DNS_URL = "http://100.100.100.100/";
const PROBE_TIMEOUT_MS = 1500;
const INTERVAL_MS = 30000;

let chipEl = null;
let dotEl = null;
let inFlight = false;
let overlayRef = null;

export function initTailscale(overlay) {
  overlayRef = overlay;
  chipEl = document.getElementById("tailscale-chip");
  if (!chipEl) return;
  dotEl = chipEl.querySelector(".status-dot");

  const useCustom = location.protocol === "https:";
  const customUrl = overlayRef?.settings?.tailscaleProbeUrl?.trim();

  if (useCustom && !customUrl) {
    // HTTPS but no probe URL configured.
    paint("configure");
    return;
  }

  paint("unknown");
  chipEl.addEventListener("click", () => {
    if (inFlight) return;
    runProbe();
  });
  runProbe();
  setInterval(runProbe, INTERVAL_MS);
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

async function probe() {
  const url = probeUrl();
  const isCustom = url !== MAGIC_DNS_URL;
  try {
    await fetch(url, {
      // Custom HTTPS URL: use cors (or no-cors for NAS endpoints that lack CORS headers).
      // We don't need the body — any response (even 403/404) means the tailnet is reachable.
      mode: isCustom ? "no-cors" : "no-cors",
      signal: makeTimeoutSignal(PROBE_TIMEOUT_MS),
    });
    return "on";
  } catch {
    return "off";
  }
}

async function runProbe() {
  if (inFlight) return;
  inFlight = true;
  paint("checking");
  const state = await probe();
  inFlight = false;
  paint(state);
}

function paint(state) {
  if (!chipEl || !dotEl) return;
  chipEl.dataset.state = state;
  dotEl.className = `status-dot status-dot-${state}`;
  let title;
  if (state === "on" || state === "off") {
    const now = new Date().toLocaleTimeString();
    const url = probeUrl();
    title =
      state === "on"
        ? `Tailscale up — checked ${now} (${url})`
        : `Tailscale down — checked ${now} (${url})`;
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
