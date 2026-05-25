# Tailscale Status + Most-Visited Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two features — a Tailscale up/down chip in the header and a click-count driven "Frequent" sidebar group above pinned favorites.

**Architecture:** Browser-only Tailscale detection via MagicDNS fetch probe (no backend bridge). Click counts persist in the existing localStorage overlay with a schema bump (v1 → v2). Two new modules (`js/tailscale.js`, `js/stats.js`) and small edits to existing render + storage modules.

**Tech Stack:** Vanilla JS ES modules, no build, no tests (per project policy — tasks include manual smoke checks instead of TDD steps), localStorage overlay.

**Spec:** `docs/superpowers/specs/2026-05-25-tailscale-and-most-visited-design.md`

---

## File Map

### New
- `js/tailscale.js` — MagicDNS probe + chip paint, interval loop, click handler.
- `js/stats.js` — click count recording, top-N query, clear.

### Modified
- `js/storage.js` — schema v2 + migration.
- `js/main.js` — wire `initStats` + `initTailscale`.
- `js/render/grid.js` — record click on card.
- `js/render/sidebar.js` — record click on pinned/frequent; render Frequent group.
- `js/crud/settings.js` — add "Clear usage stats" button.
- `index.html` — add `#tailscale-chip` element.
- `styles/main.css` — `.tailscale-chip`, `.status-dot`, `.nav-frequent`.

---

## Task 1: Overlay schema bump v1 → v2 (clickCounts)

**Files:**
- Modify: `js/storage.js`

- [ ] **Step 1: Bump CURRENT_SCHEMA and add clickCounts to EMPTY_OVERLAY**

Replace the top of `js/storage.js`:

```js
const KEY = "startpage_overlay_v1";
const CURRENT_SCHEMA = 2;

const EMPTY_OVERLAY = {
  schemaVersion: CURRENT_SCHEMA,
  added: { categories: [], links: {} },
  edited: { categories: {}, links: {} },
  deleted: { categories: [], links: [] },
  order: { categories: [], links: {} },
  favorites: [],
  clickCounts: {},
  settings: {
    theme: undefined,
    defaultEngine: "ddg",
    customEngines: [],
    weather: null,
    username: "Marcin",
    helpDismissed: false,
  },
};
```

- [ ] **Step 2: Extend migrate() to handle the v1→v2 step**

Inside `migrate(overlay)` in `js/storage.js`, immediately after `if (!overlay.schemaVersion) overlay.schemaVersion = 1;`, insert:

```js
  // v1 → v2: introduce clickCounts
  if (overlay.schemaVersion < 2) {
    overlay.clickCounts = overlay.clickCounts || {};
    overlay.schemaVersion = 2;
  }
```

The existing defensive merge loop already copies `clickCounts` because it's a top-level key in `EMPTY_OVERLAY`. No other changes in this file.

- [ ] **Step 3: Manual smoke**

1. Open `index.html` in browser with existing overlay (schemaVersion: 1).
2. Open DevTools console, run `JSON.parse(localStorage.getItem("startpage_overlay_v1"))`.
3. Verify object has `schemaVersion: 2` and `clickCounts: {}`.
4. Verify no other fields lost (favorites, settings.* etc).

- [ ] **Step 4: Commit**

```bash
git add js/storage.js
git commit -m "Bump overlay schema to v2 with clickCounts"
```

---

## Task 2: Create `js/stats.js` module

**Files:**
- Create: `js/stats.js`

- [ ] **Step 1: Write the module**

Create `js/stats.js`:

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add js/stats.js
git commit -m "Add js/stats.js for click-count tracking"
```

---

## Task 3: Wire `initStats` in `js/main.js`

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Import initStats and call after overlay load**

In `js/main.js`, add the import alongside the other imports near the top:

```js
import { initStats } from "./stats.js";
```

Then, immediately after the `saveOverlay(overlay);` line at the top of the module (currently line 39), insert:

```js
initStats(overlay);
```

- [ ] **Step 2: Manual smoke**

1. Reload page. Open DevTools console.
2. Run `import("./js/stats.js").then(m => m.recordClick("lnk-test"))` — should not throw.
3. Inspect overlay: `JSON.parse(localStorage.getItem("startpage_overlay_v1")).clickCounts` — should be `{ "lnk-test": 1 }` after ~500ms.
4. Remove the test entry from localStorage before continuing.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "Wire initStats on app boot"
```

---

## Task 4: Record click on link cards (grid)

**Files:**
- Modify: `js/render/grid.js`

- [ ] **Step 1: Import recordClick**

Add at the top of `js/render/grid.js` next to the existing imports:

```js
import { recordClick } from "../stats.js";
```

- [ ] **Step 2: Wire on card click**

In `renderLinkCard(item)`, before the final `return card;`, add a click listener. The card is an `<a>` so it navigates; we attach a non-blocking listener:

```js
  card.addEventListener("click", (e) => {
    // Ignore clicks on inner buttons (edit, favorite) — they stopPropagation already,
    // but be defensive in case of future inner controls.
    if (e.target.closest("button")) return;
    recordClick(item.id);
  });
```

Place this right after the `card.append(faviconWrap, title, editBtn, favBtn);` line.

- [ ] **Step 3: Manual smoke**

1. Reload. Click any link card twice (open in new tabs, come back).
2. DevTools console: `JSON.parse(localStorage.getItem("startpage_overlay_v1")).clickCounts` — should show that link's id with count 2.

- [ ] **Step 4: Commit**

```bash
git add js/render/grid.js
git commit -m "Record click counts on link cards"
```

---

## Task 5: Record click on pinned items (sidebar)

**Files:**
- Modify: `js/render/sidebar.js`

- [ ] **Step 1: Import recordClick**

Add at top of `js/render/sidebar.js`:

```js
import { recordClick } from "../stats.js";
```

- [ ] **Step 2: Wire on pinned link click**

In the Pinned group rendering loop (currently around line 73-86), after the line `a.append(dot, label);` and before `pinnedWrap.appendChild(a);`, add:

```js
      a.addEventListener("click", () => recordClick(p.link.id));
```

- [ ] **Step 3: Commit**

```bash
git add js/render/sidebar.js
git commit -m "Record click counts on pinned sidebar links"
```

---

## Task 6: Render "Frequent" group in sidebar above Pinned

**Files:**
- Modify: `js/render/sidebar.js`

- [ ] **Step 1: Import topLinks**

Update the existing stats import:

```js
import { recordClick, topLinks } from "../stats.js";
```

- [ ] **Step 2: Render Frequent group before Pinned**

In `render()` in `js/render/sidebar.js`, immediately after the line `root.innerHTML = "";` and before the `// --- Pinned group ---` comment, insert:

```js
  // --- Frequent group (most clicked) ---
  const frequentLinks = topLinks(dataRef, 6);
  if (frequentLinks.length) {
    const fHeading = document.createElement("div");
    fHeading.className = "nav-section-label";
    fHeading.textContent = "Frequent";
    root.appendChild(fHeading);

    const fWrap = document.createElement("div");
    fWrap.className = "nav-pinned nav-frequent";
    frequentLinks.forEach((p) => {
      const a = document.createElement("a");
      a.className = "nav-pinned-item";
      a.href = p.link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const dot = document.createElement("span");
      dot.className = `cat-dot ${p.color}`;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = p.link.name;
      a.append(dot, label);
      a.addEventListener("click", () => recordClick(p.link.id));
      fWrap.appendChild(a);
    });
    root.appendChild(fWrap);

    const fDivider = document.createElement("div");
    fDivider.className = "nav-divider";
    root.appendChild(fDivider);
  }
```

- [ ] **Step 3: Manual smoke**

1. Reload. With no link having count ≥ 2, sidebar should look unchanged (no Frequent group).
2. Click one card 2+ times.
3. Refresh page. Sidebar should show "Frequent" section at the top with that link.
4. Pinned group (if any) should appear below it, then categories.

- [ ] **Step 4: Commit**

```bash
git add js/render/sidebar.js
git commit -m "Render Frequent group above Pinned in sidebar"
```

---

## Task 7: "Clear usage stats" button in Settings

**Files:**
- Modify: `js/crud/settings.js`

- [ ] **Step 1: Import clearStats**

Add to the top of `js/crud/settings.js`:

```js
import { clearStats } from "../stats.js";
```

- [ ] **Step 2: Add button to Data section**

In `openSettings()` inside the `body.innerHTML` template literal, locate the Data section button row:

```html
        <button class="btn btn-danger" id="set-full-reset">Full reset (incl. settings)</button>
      </div>
    </section>
```

Insert a new button before `</div>`:

```html
        <button class="btn" id="set-clear-stats">Clear usage stats</button>
```

- [ ] **Step 3: Wire the handler**

After the line `body.querySelector("#set-full-reset").onclick = fullReset;`, add:

```js
  body.querySelector("#set-clear-stats").onclick = clearStatsHandler;
```

- [ ] **Step 4: Add the handler function**

At the bottom of `js/crud/settings.js`, add:

```js
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
```

- [ ] **Step 5: Manual smoke**

1. Click a card twice; refresh; verify Frequent group exists.
2. Open Settings → Data → "Clear usage stats" → Confirm.
3. Verify toast appears and Frequent group disappears.

- [ ] **Step 6: Commit**

```bash
git add js/crud/settings.js
git commit -m "Add Clear usage stats action in Settings"
```

---

## Task 8: Create `js/tailscale.js` module

**Files:**
- Create: `js/tailscale.js`

- [ ] **Step 1: Write the module**

Create `js/tailscale.js`:

```js
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
  const now = new Date().toLocaleTimeString();
  const labels = {
    unknown: "Tailscale — not checked yet",
    checking: "Checking Tailscale…",
    on: `Tailscale up — checked ${now}`,
    off: `Tailscale down — checked ${now}`,
  };
  chipEl.title = labels[state] || labels.unknown;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/tailscale.js
git commit -m "Add js/tailscale.js with MagicDNS probe"
```

---

## Task 9: Add Tailscale chip element to `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Insert chip before #weather-chip**

In `index.html`, locate the `<div class="header-right">` block. Immediately before the existing `<button id="weather-chip" …>`, insert:

```html
            <button
              id="tailscale-chip"
              class="tailscale-chip"
              type="button"
              data-state="unknown"
              title="Tailscale — not checked yet"
            >
              <span class="status-dot status-dot-unknown"></span>
              <span class="tailscale-label">Tailscale</span>
            </button>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "Add Tailscale chip element to header"
```

---

## Task 10: Wire `initTailscale` in `js/main.js`

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Import and call**

In `js/main.js`, add the import next to other imports:

```js
import { initTailscale } from "./tailscale.js";
```

Then, after the existing `initWeather({ overlay });` line, add:

```js
initTailscale();
```

- [ ] **Step 2: Manual smoke**

1. With Tailscale running on the host: reload page. Chip dot should turn green within ~1.5s. Hover shows "Tailscale up — checked …".
2. Stop tailscaled (`tailscale down` or close client). Click the chip. Dot should turn red within ~1.5s.
3. Restart tailscaled. Wait up to 30s or click the chip; dot turns green again.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "Wire initTailscale on app boot"
```

---

## Task 11: CSS for `.tailscale-chip`, `.status-dot`, `.nav-frequent`

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Append new rules at the bottom of the file**

Add these rules at the end of `styles/main.css`:

```css
/* Tailscale chip — reuses weather-chip rhythm but slimmer */
.tailscale-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 99px;
  padding: 8px 14px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: var(--transition);
}
.tailscale-chip:hover {
  background: var(--surface-2);
  color: var(--text-main);
}
.tailscale-chip[data-state="checking"] {
  opacity: 0.75;
}

/* Status dot used by tailscale-chip (and future indicators) */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b; /* slate-500 default */
  display: inline-block;
  flex-shrink: 0;
}
.status-dot-unknown {
  background: #64748b;
}
.status-dot-checking {
  background: #94a3b8;
  animation: status-dot-pulse 1s ease-in-out infinite;
}
.status-dot-on {
  background: #34d399; /* emerald-400 */
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
}
.status-dot-off {
  background: #fb7185; /* rose-400 */
}

@keyframes status-dot-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Frequent sidebar group — visually identical to .nav-pinned */
.nav-frequent {
  /* Inherits .nav-pinned rules. Hook left for future tweaks. */
}
```

- [ ] **Step 2: Manual smoke**

1. Reload. Verify:
   - Tailscale chip sits left of the weather chip, with a small colored dot.
   - Dot pulses gray briefly while checking, then settles green or red.
   - Frequent group (if visible) looks identical to Pinned styling.

- [ ] **Step 3: Commit**

```bash
git add styles/main.css
git commit -m "Style tailscale chip, status dot, and frequent group"
```

---

## Final Verification

- [ ] **Full smoke pass**

1. **Tailscale on path:** Tailscale running → chip green within 2s of load, hover tooltip shows current check time.
2. **Tailscale off path:** Stop tailscaled → click chip → chip flips to red within 2s.
3. **Auto-refresh:** Wait 30s with state changed externally → chip updates without click.
4. **Most-visited:**
   - Fresh overlay (or after Clear) → no Frequent group.
   - Click one card twice → refresh → Frequent group shows the link with same color dot as its category.
   - Click 7 different links 2+ times each → Frequent shows top 6 by count.
5. **Clear stats:** Settings → Clear usage stats → confirm → Frequent disappears.
6. **Schema migration:** Manually edit localStorage to `"schemaVersion": 1` and remove `clickCounts`. Reload. Verify `schemaVersion` becomes 2 and `clickCounts: {}` is restored without losing other fields.
7. **Pinned still works:** Pin a link via star → Pinned group still renders below Frequent.

- [ ] **Final commit (if any cleanup needed)**

If any small fixes surface during the smoke pass, commit them as a focused follow-up commit. Otherwise no further commit is needed.
