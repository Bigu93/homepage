// js/crud/settings.js
// Settings panel: username, default engine, custom engines, weather config, import/export/reset.

import { openModal, closeModal, confirmDialog, toast } from "./modal.js";
import { BUILTIN_ENGINES } from "../engines.js";
import { reset as resetStorage, save as saveOverlay } from "../storage.js";
import { clearStats } from "../stats.js";

let overlayRef = null;
let onChangeCb = null;

export function initSettings({ overlay, onChange }) {
  overlayRef = overlay;
  onChangeCb = onChange;
  const btn = document.getElementById("settings-toggle");
  if (btn) btn.onclick = () => openSettings();
}

function persistAndNotify() {
  saveOverlay(overlayRef);
  if (onChangeCb) onChangeCb();
}

export function openSettings(scrollTo) {
  const body = document.createElement("div");
  body.className = "settings-body";
  body.innerHTML = `
    <section class="settings-section" data-section="general">
      <h3>General</h3>
      <div class="field">
        <label>Username</label>
        <input id="set-username" type="text" maxlength="40">
      </div>
    </section>

    <section class="settings-section" data-section="search">
      <h3>Search</h3>
      <div class="field">
        <label>Default engine</label>
        <select id="set-default-engine"></select>
      </div>
      <div class="field">
        <label>Custom engines &amp; prefixes</label>
        <div id="set-customs"></div>
        <button class="btn btn-ghost" id="set-add-engine" style="margin-top:0.5rem">+ Add custom engine</button>
      </div>
    </section>

    <section class="settings-section" data-section="weather">
      <h3>Weather</h3>
      <p class="settings-hint">OpenWeatherMap free tier. <a href="https://home.openweathermap.org/users/sign_up" target="_blank" rel="noopener">Get free API key →</a></p>
      <div class="field">
        <label>API key</label>
        <input id="set-weather-key" type="password" placeholder="your-api-key">
      </div>
      <div class="field">
        <label>Location (city, country)</label>
        <input id="set-weather-loc" type="text" placeholder="Warsaw, PL">
        <div id="set-weather-results" style="margin-top:0.5rem;display:none"></div>
      </div>
      <div class="field">
        <label>Units</label>
        <select id="set-weather-units">
          <option value="metric">Celsius (°C)</option>
          <option value="imperial">Fahrenheit (°F)</option>
        </select>
      </div>
      <button class="btn" id="set-weather-test">Test</button>
      <span id="set-weather-status" style="margin-left:0.75rem;font-size:0.8125rem"></span>
    </section>

    <section class="settings-section" data-section="data">
      <h3>Data</h3>
      <p class="settings-hint">All your data lives in this browser's localStorage. Back up regularly.</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="btn" id="set-export">Export JSON</button>
        <button class="btn" id="set-import">Import JSON</button>
        <input type="file" id="set-import-file" accept="application/json" style="display:none">
        <button class="btn btn-danger" id="set-reset">Reset to defaults</button>
        <button class="btn" id="set-clear-stats">Clear usage stats</button>
        <button class="btn btn-danger" id="set-full-reset">Full reset (incl. settings)</button>
      </div>
    </section>
  `;

  // Pre-fill values
  body.querySelector("#set-username").value =
    overlayRef.settings.username || "";
  const defEngSel = body.querySelector("#set-default-engine");
  populateEngineOptions(defEngSel);
  defEngSel.value = overlayRef.settings.defaultEngine || "ddg";

  renderCustoms(body.querySelector("#set-customs"));

  const w = overlayRef.settings.weather || {};
  body.querySelector("#set-weather-key").value = w.apiKey || "";
  body.querySelector("#set-weather-loc").value = w.label || "";
  body.querySelector("#set-weather-units").value = w.units || "metric";

  // Wire handlers
  body.querySelector("#set-username").oninput = (e) => {
    overlayRef.settings.username = e.target.value.trim() || "there";
    persistAndNotify();
  };
  defEngSel.onchange = (e) => {
    overlayRef.settings.defaultEngine = e.target.value;
    persistAndNotify();
  };
  body.querySelector("#set-add-engine").onclick = () =>
    addCustomRow(body.querySelector("#set-customs"));

  body.querySelector("#set-weather-key").onchange = (e) => {
    overlayRef.settings.weather = {
      ...(overlayRef.settings.weather || {}),
      apiKey: e.target.value.trim(),
    };
    persistAndNotify();
  };
  body.querySelector("#set-weather-units").onchange = (e) => {
    overlayRef.settings.weather = {
      ...(overlayRef.settings.weather || {}),
      units: e.target.value,
    };
    persistAndNotify();
  };
  body.querySelector("#set-weather-loc").onblur = (e) =>
    geocode(e.target.value, body);
  body.querySelector("#set-weather-test").onclick = () => testWeather(body);

  body.querySelector("#set-export").onclick = exportData;
  body.querySelector("#set-import").onclick = () =>
    body.querySelector("#set-import-file").click();
  body.querySelector("#set-import-file").onchange = (e) =>
    importData(e.target.files[0]);
  body.querySelector("#set-reset").onclick = resetData;
  body.querySelector("#set-full-reset").onclick = fullReset;
  body.querySelector("#set-clear-stats").onclick = clearStatsHandler;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "flex-end";
  const done = document.createElement("button");
  done.className = "btn btn-primary";
  done.textContent = "Done";
  done.onclick = closeModal;
  footer.appendChild(done);

  openModal({ title: "Settings", body, footer, width: "560px" });

  if (scrollTo) {
    const target = body.querySelector(`[data-section="${scrollTo}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function populateEngineOptions(sel) {
  sel.innerHTML = "";
  const all = [
    ...BUILTIN_ENGINES,
    ...(overlayRef.settings.customEngines || []),
  ];
  all.forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e.key;
    opt.textContent = `${e.label} (${e.key})`;
    sel.appendChild(opt);
  });
}

function renderCustoms(root) {
  root.innerHTML = "";
  (overlayRef.settings.customEngines || []).forEach((eng, idx) => {
    root.appendChild(customRow(eng, idx));
  });
}

function customRow(eng, idx) {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "80px 1fr 1fr auto";
  row.style.gap = "0.375rem";
  row.style.marginBottom = "0.375rem";

  const keyI = document.createElement("input");
  keyI.type = "text";
  keyI.placeholder = "prefix";
  keyI.value = eng.key || "";

  const labelI = document.createElement("input");
  labelI.type = "text";
  labelI.placeholder = "Label";
  labelI.value = eng.label || "";

  const urlI = document.createElement("input");
  urlI.type = "url";
  urlI.placeholder = "https://…/?q=%s";
  urlI.value = eng.urlTemplate || "";

  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-ghost";
  delBtn.title = "Remove";
  delBtn.textContent = "×";

  row.append(keyI, labelI, urlI, delBtn);

  const persist = () => {
    overlayRef.settings.customEngines[idx] = {
      key: keyI.value.trim(),
      label: labelI.value.trim(),
      urlTemplate: urlI.value.trim(),
    };
    persistAndNotify();
  };
  keyI.onchange = persist;
  labelI.onchange = persist;
  urlI.onchange = persist;
  delBtn.onclick = () => {
    overlayRef.settings.customEngines.splice(idx, 1);
    persistAndNotify();
    renderCustoms(row.parentElement);
  };
  return row;
}

function addCustomRow(root) {
  if (!overlayRef.settings.customEngines)
    overlayRef.settings.customEngines = [];
  overlayRef.settings.customEngines.push({
    key: "",
    label: "",
    urlTemplate: "",
  });
  renderCustoms(root);
}

async function geocode(query, body) {
  const key = overlayRef.settings.weather?.apiKey;
  if (!key || !query) return;
  const resultsBox = body.querySelector("#set-weather-results");
  resultsBox.innerHTML = "Looking up…";
  resultsBox.style.display = "block";
  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${key}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    if (!list.length) {
      resultsBox.textContent = "No results.";
      return;
    }
    resultsBox.innerHTML = "";
    list.forEach((loc) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.style.display = "block";
      btn.style.marginBottom = "0.25rem";
      btn.style.width = "100%";
      btn.textContent = `${loc.name}${loc.state ? ", " + loc.state : ""}, ${loc.country}`;
      btn.onclick = () => {
        overlayRef.settings.weather = {
          ...(overlayRef.settings.weather || {}),
          lat: loc.lat,
          lon: loc.lon,
          label: btn.textContent,
        };
        persistAndNotify();
        resultsBox.style.display = "none";
        body.querySelector("#set-weather-loc").value = btn.textContent;
      };
      resultsBox.appendChild(btn);
    });
  } catch (e) {
    console.warn("[settings] geocode failed:", e);
    resultsBox.textContent = `Error: ${e.message}`;
  }
}

async function testWeather(body) {
  const status = body.querySelector("#set-weather-status");
  status.textContent = "Testing…";
  status.style.color = "var(--text-muted)";
  const w = overlayRef.settings.weather || {};
  if (!w.apiKey || w.lat == null || w.lon == null) {
    status.textContent = "Need API key + location.";
    status.style.color = "#fb7185";
    return;
  }
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${w.lat}&lon=${w.lon}&units=${w.units || "metric"}&appid=${w.apiKey}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    status.textContent = `OK — ${Math.round(data.main.temp)}°`;
    status.style.color = "#4ade80";
  } catch (e) {
    status.textContent = `Failed: ${e.message}`;
    status.style.color = "#fb7185";
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(overlayRef, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `startpage-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Exported.", "success");
}

async function importData(file) {
  if (!file) return;
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    toast(`Invalid JSON: ${e.message}`, "error");
    return;
  }
  if (typeof parsed !== "object" || !parsed || !("schemaVersion" in parsed)) {
    toast("Missing schemaVersion — not a valid backup.", "error");
    return;
  }
  const ok = await confirmDialog({
    title: "Import overlay",
    message:
      "This replaces all your current links, edits, favorites, and settings. Continue?",
    confirmLabel: "Replace",
    danger: true,
  });
  if (!ok) return;
  // Clear all existing keys then assign from parsed — full replace, not merge.
  for (const k of Object.keys(overlayRef)) delete overlayRef[k];
  Object.assign(overlayRef, parsed);
  persistAndNotify();
  toast("Imported. Reloading…", "success");
  setTimeout(() => location.reload(), 600);
}

async function resetData() {
  const ok = await confirmDialog({
    title: "Reset to defaults",
    message:
      "Deletes all your added links, edits, deletions, reorderings, and favorites. Settings (theme, weather, engines, username) are kept.",
    confirmLabel: "Reset",
    danger: true,
  });
  if (!ok) return;
  const settings = { ...overlayRef.settings };
  overlayRef.added = { categories: [], links: {} };
  overlayRef.edited = { categories: {}, links: {} };
  overlayRef.deleted = { categories: [], links: [] };
  overlayRef.order = { categories: [], links: {} };
  overlayRef.favorites = [];
  overlayRef.settings = settings;
  persistAndNotify();
  toast("Reset. Reloading…", "success");
  setTimeout(() => location.reload(), 600);
}

async function clearStatsHandler() {
  const ok = await confirmDialog({
    title: "Clear usage stats",
    message:
      "Resets every link's click count to zero. The Frequent sidebar group will disappear until you build up new counts. Continue?",
    confirmLabel: "Clear",
    danger: true,
  });
  if (!ok) return;
  clearStats();
  if (onChangeCb) onChangeCb();
  toast("Usage stats cleared.", "success");
}

async function fullReset() {
  const ok = await confirmDialog({
    title: "Full reset",
    message:
      "Deletes EVERYTHING — links, edits, settings, theme, weather, engines. Cannot be undone.",
    confirmLabel: "Wipe everything",
    danger: true,
  });
  if (!ok) return;
  resetStorage();
  toast("Wiped. Reloading…", "success");
  setTimeout(() => location.reload(), 600);
}
