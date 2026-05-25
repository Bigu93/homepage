// js/tailscale.js
// Tailscale up/down indicator via MagicDNS fetch probe.

const PROBE_URL = "http://100.100.100.100/";
const PROBE_TIMEOUT_MS = 1500;
const INTERVAL_MS = 30000;

let chipEl = null;
let dotEl = null;
let inFlight = false;

export function initTailscale() {
  chipEl = document.getElementById("tailscale-chip");
  if (!chipEl) return;
  dotEl = chipEl.querySelector(".status-dot");
  // Mixed-content guard: HTTPS pages cannot fetch http://100.100.100.100.
  // Show a clear "blocked" state instead of probing forever.
  if (location.protocol === "https:") {
    paint("blocked");
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

function makeTimeoutSignal(ms) {
  // AbortSignal.timeout is widely supported in modern browsers; fall back if missing.
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

async function probe() {
  try {
    await fetch(PROBE_URL, {
      mode: "no-cors",
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
    title =
      state === "on"
        ? `Tailscale up — checked ${now}`
        : `Tailscale down — checked ${now}`;
  } else if (state === "checking") {
    title = "Checking Tailscale…";
  } else if (state === "blocked") {
    title =
      "Tailscale probe blocked — the page is served over HTTPS, but the MagicDNS endpoint is HTTP. Open the page over HTTP or file:// to enable.";
  } else {
    title = "Tailscale — not checked yet";
  }
  chipEl.title = title;
}
