# Startpage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `js/dashboard.js` into ES modules, refine the dashboard visuals, add full link CRUD with localStorage overlay on top of `shortcuts.js` seed, bring back web search + weather, ship an in-app help guide.

**Architecture:** State module holds in-memory merged categories+links (seed ⊕ overlay). Render modules subscribe and re-render. CRUD mutates state via `storage.js` which persists the overlay (`startpage_overlay_v1` in localStorage). No bundler, no test framework — native ES module imports, manual verification per spec checklist.

**Tech Stack:** Vanilla JS (ES modules), HTML5, CSS3, OpenWeatherMap API, Google s2 favicons. No build, no runtime deps.

**Spec:** [docs/superpowers/specs/2026-05-24-startpage-redesign-design.md](../specs/2026-05-24-startpage-redesign-design.md)

**Verification:** No test framework in scope. Each task has a "Verify" step describing exact browser action + expected outcome. Spec contains the full manual checklist run at the end.

**Phase layout** (each ends with green commit, app still works):

1. Refactor — extract modules from dashboard.js (no behavior change)
2. Data layer — seed normalization, overlay schema, merge, migrations
3. Visual polish — fonts, spacing, color, animations
4. Modal primitive + toast
5. Settings panel + theme/username/import/export/reset
6. Link editor (add/edit/delete)
7. Category editor + per-category controls
8. Drag-to-reorder (desktop + touch)
9. Smart unified search + engines + prefixes
10. Weather widget
11. Help guide + README rewrite + final cleanup

---

## Phase 1 — Refactor dashboard.js into modules

No behavior change. Existing `js/dashboard.js` is split into focused modules, then deleted. Tested by reloading the page and confirming everything still works.

### Task 1.1: Extract icon registry

**Files:**
- Create: `js/icons.js`
- Modify: `js/dashboard.js` (remove `ICONS` const, import it instead)

- [ ] **Step 1: Create `js/icons.js` with the existing SVG strings**

```js
// js/icons.js
// SVG icon registry. Keys match the `icon` field in shortcuts.js categories.
// Strings are emitted via innerHTML — keep them trusted (no user input).

export const ICONS = {
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  "graduation-cap": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  terminal: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  "gamepad-2": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`,
  newspaper: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  "shopping-cart": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  joystick: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z"/><path d="M6 15v-2"/><path d="M12 15V9"/><circle cx="12" cy="6" r="3"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  server: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
  flag: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
};

export function iconHTML(name) {
  return ICONS[name] || ICONS.default;
}
```

- [ ] **Step 2: Replace the `ICONS` const in `js/dashboard.js` with an import**

In `js/dashboard.js`, delete the entire `const ICONS = { … }` block (the big block at the top defining all the SVGs). Replace it with this import at the top of the file (after the existing `import data from "./shortcuts.js"`):

```js
import { ICONS } from "./icons.js";
```

- [ ] **Step 3: Verify**

Open `index.html` in browser. Hard reload (Ctrl+Shift+R). Expected: sidebar icons render, theme toggle icon renders, star icons render — identical to before.

- [ ] **Step 4: Commit**

```bash
git add js/icons.js js/dashboard.js
git commit -m "refactor(icons): extract SVG icon registry to js/icons.js"
```

### Task 1.2: Extract favicon cache module

**Files:**
- Create: `js/favicons.js`
- Modify: `js/dashboard.js` (remove favicon functions + constants, import them)

- [ ] **Step 1: Create `js/favicons.js`**

```js
// js/favicons.js
// Favicon URL helper + 30-day localStorage cache.

const CACHE_KEY = "favicons_cache";
const EXPIRY_DAYS = 30;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("[favicons] cache parse failed:", e);
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("[favicons] cache write failed:", e);
  }
}

export function getFavicon(url) {
  const cache = readCache();
  const cached = cache[url];
  if (cached && Date.now() < cached.timestamp + EXPIRY_MS) {
    return cached.faviconUrl;
  }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;
  cache[url] = { faviconUrl, timestamp: Date.now() };
  writeCache(cache);
  return faviconUrl;
}

export function clearExpiredFavicons() {
  const cache = readCache();
  const cutoff = Date.now() - EXPIRY_MS;
  let changed = false;
  for (const key in cache) {
    if (cache[key].timestamp < cutoff) {
      delete cache[key];
      changed = true;
    }
  }
  if (changed) writeCache(cache);
}
```

- [ ] **Step 2: Replace favicon code in `js/dashboard.js`**

Delete from `js/dashboard.js`:
- `const FAVICON_CACHE_KEY = …`
- `const FAVICON_CACHE_EXPIRY_DAYS = …`
- `function getFavicon(...) { … }`
- `function getFaviconCache() { … }`
- `function clearExpiredFaviconCache() { … }`

At top of `js/dashboard.js`, add:

```js
import { getFavicon, clearExpiredFavicons } from "./favicons.js";
```

Find the call site `clearExpiredFaviconCache();` near the bottom and rename to `clearExpiredFavicons();`.

- [ ] **Step 3: Verify**

Hard reload `index.html`. Expected: link cards show favicons. Open DevTools → Application → Local Storage → `favicons_cache` entry still present (key unchanged).

- [ ] **Step 4: Commit**

```bash
git add js/favicons.js js/dashboard.js
git commit -m "refactor(favicons): extract favicon cache to js/favicons.js"
```

### Task 1.3: Extract clock + greeting

**Files:**
- Create: `js/clock.js`
- Modify: `js/dashboard.js`

- [ ] **Step 1: Create `js/clock.js`**

```js
// js/clock.js
// Updates the clock + date + greeting every second.

let usernameRef = "Marcin";

export function setUsername(name) {
  usernameRef = name || "there";
  tick(); // refresh greeting immediately
}

function tick() {
  const clock = document.getElementById("clock");
  const dateDisplay = document.getElementById("date-display");
  const greeting = document.getElementById("greeting");
  if (!clock || !dateDisplay || !greeting) return;

  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  dateDisplay.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = now.getHours();
  let salutation = "Good Evening,";
  if (hour < 12) salutation = "Good Morning,";
  else if (hour < 18) salutation = "Good Afternoon,";
  greeting.textContent = `${salutation} ${usernameRef}`;
}

export function startClock(username) {
  if (username) usernameRef = username;
  tick();
  setInterval(tick, 1000);
}
```

- [ ] **Step 2: Replace clock code in `js/dashboard.js`**

Delete from `js/dashboard.js`:
- `function updateTime() { … }`
- The call sites `setInterval(updateTime, 1000); updateTime();`

At top of `js/dashboard.js`, add:

```js
import { startClock } from "./clock.js";
```

Near the bottom (where `updateTime()` was called), add:

```js
startClock("Marcin");
```

Also delete the `dom.clock`, `dom.dateDisplay`, `dom.greeting` entries from the `dom` object — clock module reads them by id directly.

- [ ] **Step 3: Verify**

Reload page. Expected: clock shows current time, date shows today's weekday + month + day, greeting shows "Good …, Marcin". Wait one minute — time advances.

- [ ] **Step 4: Commit**

```bash
git add js/clock.js js/dashboard.js
git commit -m "refactor(clock): extract clock + greeting to js/clock.js"
```

### Task 1.4: Extract theme module

**Files:**
- Create: `js/theme.js`
- Modify: `js/dashboard.js`

- [ ] **Step 1: Create `js/theme.js`**

```js
// js/theme.js
// Dark/light theme toggle with persistence.

import { ICONS } from "./icons.js";

const KEY = "theme";
let current = localStorage.getItem(KEY) || "dark";

export function getTheme() {
  return current;
}

export function applyTheme() {
  const isDark = current === "dark";
  document.documentElement.setAttribute("data-theme", current);
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  const icon = toggle.querySelector(".icon");
  if (!icon) return;
  icon.innerHTML = isDark ? ICONS.moon : ICONS.sun;
  icon.animate(
    [
      { transform: "rotate(0deg) scale(0.5)" },
      { transform: "rotate(360deg) scale(1)" },
    ],
    { duration: 500, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  );
}

export function toggleTheme() {
  current = current === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, current);
  applyTheme();
}

export function initTheme() {
  applyTheme();
  const toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.onclick = toggleTheme;
}
```

- [ ] **Step 2: Replace theme code in `js/dashboard.js`**

Delete from `js/dashboard.js`:
- `state.theme = …` from the state object initializer
- `function toggleTheme() { … }`
- `function applyTheme() { … }`
- The call site `applyTheme();`
- The call site `dom.themeToggle.onclick = toggleTheme;`
- The `dom.themeToggle` entry from the `dom` object

At top of `js/dashboard.js`, add:

```js
import { initTheme } from "./theme.js";
```

Near the bottom (where `applyTheme()` was called), add:

```js
initTheme();
```

- [ ] **Step 3: Verify**

Reload page. Click the Theme button in sidebar footer. Expected: switches to light theme, icon spins to sun. Reload — light theme persists. Click again to dark.

- [ ] **Step 4: Commit**

```bash
git add js/theme.js js/dashboard.js
git commit -m "refactor(theme): extract dark/light theme to js/theme.js"
```

### Task 1.5: Extract render functions

**Files:**
- Create: `js/render/sidebar.js`, `js/render/grid.js`
- Modify: `js/dashboard.js`

- [ ] **Step 1: Create `js/render/sidebar.js`**

```js
// js/render/sidebar.js
// Renders the sidebar category list.

import { ICONS } from "../icons.js";

let dataRef = [];
let activeCategoryRef = "all";
let onSelect = null;

export function initSidebar({ data, activeCategory, onCategorySelect }) {
  dataRef = data;
  activeCategoryRef = activeCategory;
  onSelect = onCategorySelect;
  render();
}

export function setActive(category) {
  activeCategoryRef = category;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    const isAll = category === "all" && el.dataset.cat === "all";
    const isCat = el.textContent.trim() === category;
    if (isAll || isCat) el.classList.add("active");
  });
}

function render() {
  const root = document.getElementById("sidebar-categories");
  if (!root) return;
  root.innerHTML = "";
  dataRef.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${activeCategoryRef === cat.category ? "active" : ""}`;
    btn.onclick = () => onSelect && onSelect(cat.category);

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    btn.append(iconSpan, labelSpan);
    root.appendChild(btn);
  });
}
```

- [ ] **Step 2: Create `js/render/grid.js`**

```js
// js/render/grid.js
// Renders the main content area: link cards grouped by category, or filtered search results.

import { ICONS } from "../icons.js";
import { getFavicon } from "../favicons.js";

let dataRef = [];
let stateRef = null; // { activeCategory, searchQuery, favorites: Set }
let onFavoriteToggle = null;

export function initGrid({ data, state, onToggleFavorite }) {
  dataRef = data;
  stateRef = state;
  onFavoriteToggle = onToggleFavorite;
  render();
}

export function setData(data) {
  dataRef = data;
  render();
}

export function setState(partial) {
  Object.assign(stateRef, partial);
  render();
}

function render() {
  const root = document.getElementById("view-container");
  if (!root) return;
  root.innerHTML = "";
  const query = (stateRef.searchQuery || "").toLowerCase();

  if (query) {
    renderSearchResults(root, query);
    return;
  }

  const filtered =
    stateRef.activeCategory === "all"
      ? dataRef
      : dataRef.filter((c) => c.category === stateRef.activeCategory);

  filtered.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";

    const header = document.createElement("h2");
    header.className = `category-header ${cat.color}`;
    header.innerHTML = `<span class="cat-dot"></span>${cat.category}`;

    const grid = document.createElement("div");
    grid.className = "grid-view";

    Object.entries(cat.items).forEach(([name, url]) => {
      grid.appendChild(renderLinkCard(name, url));
    });

    section.append(header, grid);
    root.appendChild(section);
  });
}

function renderSearchResults(root, query) {
  const matches = [];
  dataRef.forEach((cat) => {
    Object.entries(cat.items).forEach(([name, url]) => {
      if (name.toLowerCase().includes(query) || url.toLowerCase().includes(query)) {
        matches.push({ name, url });
      }
    });
  });
  if (matches.length === 0) {
    root.innerHTML = `<div class="empty-state">No results found for "${stateRef.searchQuery}"</div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid-view";
  matches.forEach((m) => grid.appendChild(renderLinkCard(m.name, m.url)));
  root.appendChild(grid);
}

function renderLinkCard(name, url) {
  const card = document.createElement("a");
  card.href = url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const icon = document.createElement("img");
  icon.src = getFavicon(url);
  icon.loading = "lazy";

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = name;

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(url) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(url);
  };

  card.append(icon, title, favBtn);
  return card;
}
```

- [ ] **Step 3: Wire render modules in `js/dashboard.js`**

In `js/dashboard.js`, replace the existing `renderSidebar`, `setActiveCategory`, `renderLinkCard`, `renderView` functions with imports and thin delegations.

Delete from `js/dashboard.js`:
- `function renderSidebar() { … }`
- `function setActiveCategory(cat) { … }`
- `function renderLinkCard(name, url, categoryColor) { … }`
- `function renderView() { … }`
- `const ICONS = …` — already removed in Task 1.1, double-check.
- Top-of-file `const dom = …` object — no longer needed; only keep `dom.filterInput` reference, which we'll inline.

Add imports at top:

```js
import { initSidebar, setActive as setSidebarActive } from "./render/sidebar.js";
import { initGrid, setState as setGridState } from "./render/grid.js";
```

Replace the bottom initialization block with:

```js
function selectCategory(cat) {
  state.activeCategory = cat;
  setSidebarActive(cat);
  setGridState({ activeCategory: cat });
}

function toggleFavorite(url) {
  if (state.favorites.has(url)) state.favorites.delete(url);
  else state.favorites.add(url);
  localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
  setGridState({}); // re-render with updated favorites
}

initSidebar({ data, activeCategory: state.activeCategory, onCategorySelect: selectCategory });
initGrid({ data, state, onToggleFavorite: toggleFavorite });

document.querySelector('[data-cat="all"]').onclick = () => selectCategory("all");

const filterInput = document.getElementById("filter");
filterInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  setGridState({ searchQuery: state.searchQuery });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== filterInput) {
    e.preventDefault();
    filterInput.focus();
  }
});
```

- [ ] **Step 4: Verify**

Reload page. Click each sidebar category — content filters to that category. Click Overview — all categories shown. Type in search — results filter live. Press `/` — search focuses. Click ★ on a card — persists across reload.

- [ ] **Step 5: Commit**

```bash
git add js/render/sidebar.js js/render/grid.js js/dashboard.js
git commit -m "refactor(render): split sidebar + grid rendering into modules"
```

### Task 1.6: Replace dashboard.js with main.js entry

**Files:**
- Create: `js/main.js`
- Modify: `index.html` (script src), delete `js/dashboard.js`

- [ ] **Step 1: Create `js/main.js` consolidating what remains of dashboard.js**

```js
// js/main.js
// App entry point. Wires modules together.

import data from "./shortcuts.js";
import { clearExpiredFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";
import { initSidebar, setActive as setSidebarActive } from "./render/sidebar.js";
import { initGrid, setState as setGridState } from "./render/grid.js";

const state = {
  activeCategory: "all",
  searchQuery: "",
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
};

function selectCategory(cat) {
  state.activeCategory = cat;
  setSidebarActive(cat);
  setGridState({ activeCategory: cat });
}

function toggleFavorite(url) {
  if (state.favorites.has(url)) state.favorites.delete(url);
  else state.favorites.add(url);
  localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
  setGridState({});
}

clearExpiredFavicons();
initTheme();
startClock("Marcin");
initSidebar({ data, activeCategory: state.activeCategory, onCategorySelect: selectCategory });
initGrid({ data, state, onToggleFavorite: toggleFavorite });

document.querySelector('[data-cat="all"]').onclick = () => selectCategory("all");

const filterInput = document.getElementById("filter");
filterInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  setGridState({ searchQuery: state.searchQuery });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== filterInput) {
    e.preventDefault();
    filterInput.focus();
  }
});
```

- [ ] **Step 2: Delete `js/dashboard.js`**

```bash
git rm js/dashboard.js
```

- [ ] **Step 3: Update `index.html` script tag**

In `index.html`, replace the script line near the bottom:

```html
<script type="module" src="js/dashboard.js"></script>
```

with:

```html
<script type="module" src="js/main.js"></script>
```

- [ ] **Step 4: Verify**

Reload page. Expected: everything still works identically. Categories, search, favorites, theme, clock. Check DevTools console — no errors.

- [ ] **Step 5: Commit**

```bash
git add js/main.js index.html
git commit -m "refactor: replace dashboard.js with main.js entry point"
```

---

## Phase 2 — Data layer (seed normalization + overlay)

After this phase, the app reads from a merged data source (seed ⊕ overlay) instead of raw `shortcuts.js`. No visible UI change yet, but mutation primitives are in place for CRUD phases.

### Task 2.1: Normalize seed in `js/shortcuts.js`

**Files:**
- Modify: `js/shortcuts.js`

- [ ] **Step 1: Convert items objects to arrays with ids**

Replace the entire content of `js/shortcuts.js` with the new format. Every category and every link gets a stable `id`. Items become arrays so order is preserved.

```js
// js/shortcuts.js
// Seed data. Ids are stable — never renumber existing entries.
// Add new entries at end of arrays.

export default [
  {
    id: "cat-main",
    category: "Main",
    color: "yellow",
    icon: "home",
    items: [
      { id: "lnk-gmail", name: "gmail", url: "https://mail.google.com/mail/u/0/#inbox" },
      { id: "lnk-facebook", name: "facebook", url: "https://www.facebook.com/" },
      { id: "lnk-twitter", name: "twitter", url: "https://twitter.com" },
      { id: "lnk-google", name: "google", url: "https://www.google.com/" },
      { id: "lnk-proton", name: "proton", url: "https://account.protonvpn.com/dashboardV2" },
    ],
  },
  {
    id: "cat-dev",
    category: "Dev",
    color: "cyan",
    icon: "code",
    items: [
      { id: "lnk-github", name: "github", url: "https://github.com/Bigu93" },
      { id: "lnk-devto", name: "dev.to", url: "https://dev.to" },
      { id: "lnk-devdocs", name: "docs", url: "https://devdocs.io/" },
      { id: "lnk-idosell-npm", name: "idosell-npm", url: "https://www.npmjs.com/package/idosell" },
      { id: "lnk-idosell-doc", name: "idosell-doc", url: "https://idosell-converter.vercel.app/" },
    ],
  },
  {
    id: "cat-courses",
    category: "Courses",
    color: "cyan",
    icon: "graduation-cap",
    items: [
      { id: "lnk-xss-rat", name: "xss_rat", url: "https://thexssrat.podia.com/" },
      { id: "lnk-docker-lab", name: "docker", url: "https://labs.iximiuz.com/dashboard" },
      { id: "lnk-courses-docs", name: "docs", url: "https://devdocs.io/" },
    ],
  },
  {
    id: "cat-ai",
    category: "AI",
    color: "blue",
    icon: "cpu",
    items: [
      { id: "lnk-chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
      { id: "lnk-perplexity", name: "Perplexity", url: "https://www.perplexity.ai/" },
      { id: "lnk-claude", name: "Claude", url: "https://claude.ai/new" },
      { id: "lnk-gemini", name: "Gemini", url: "https://gemini.google.com/app" },
      { id: "lnk-deepseek", name: "DeepSeek", url: "https://chat.deepseek.com/" },
      { id: "lnk-ai-studio", name: "Google AI studio", url: "https://aistudio.google.com/" },
      { id: "lnk-glm", name: "GLM", url: "https://chat.z.ai/" },
    ],
  },
  {
    id: "cat-h4ck1ng",
    category: "H4ck1ng",
    color: "red",
    icon: "terminal",
    items: [
      { id: "lnk-tryhackme", name: "tryhackme", url: "https://tryhackme.com/dashboard" },
      { id: "lnk-hackthebox", name: "hackthebox", url: "https://app.hackthebox.com/home" },
      { id: "lnk-ine", name: "ine", url: "https://my.ine.com/dashboard/learning" },
      { id: "lnk-pwn-college", name: "pwn.college", url: "https://pwn.college/" },
      { id: "lnk-hacktricks", name: "hacktricks", url: "https://book.hacktricks.xyz/welcome/readme" },
      { id: "lnk-hackersploit", name: "hackersploit", url: "https://hackersploit.org/penetration-testing-tutorials/" },
      { id: "lnk-cryptohack", name: "cryptohack", url: "https://cryptohack.org/" },
      { id: "lnk-hacking-articles", name: "hacking articles", url: "https://www.hackingarticles.in/" },
    ],
  },
  {
    id: "cat-work",
    category: "Work",
    color: "green",
    icon: "briefcase",
    items: [
      { id: "lnk-trello", name: "trello", url: "https://trello.com" },
      { id: "lnk-linkedin", name: "linkedin", url: "https://linkedin.com" },
      { id: "lnk-buto-panel", name: "buto panel", url: "https://butosklep.pl/panel" },
      { id: "lnk-bing-ads", name: "bing ads", url: "https://ui.ads.microsoft.com/campaign/vnext/overview" },
    ],
  },
  {
    id: "cat-fun",
    category: "Fun",
    color: "purple",
    icon: "gamepad-2",
    items: [
      { id: "lnk-wykop", name: "wykop", url: "https://wykop.pl/" },
      { id: "lnk-youtube", name: "youtube", url: "https://www.youtube.com/" },
      { id: "lnk-twitch", name: "twitch", url: "https://www.twitch.tv/" },
      { id: "lnk-pepper", name: "pepper", url: "https://www.pepper.pl/dlaciebie" },
      { id: "lnk-ytmusic", name: "ytmusic", url: "https://music.youtube.com/" },
      { id: "lnk-ggdeals", name: "ggdeals", url: "https://gg.deals/" },
      { id: "lnk-torrent", name: "torrent", url: "https://polskie-torrenty.eu/" },
      { id: "lnk-xtorrent", name: "xtorrent", url: "https://xtorrenty.org/" },
    ],
  },
  {
    id: "cat-info",
    category: "Info",
    color: "green",
    icon: "newspaper",
    items: [
      { id: "lnk-tugazeta", name: "tugazeta", url: "https://tugazeta.pl/" },
      { id: "lnk-sekurak", name: "sekurak", url: "https://sekurak.pl/" },
      { id: "lnk-world-news", name: "world_news", url: "https://brutalist.report/topic/news?limit=5" },
      { id: "lnk-tech-news", name: "tech_news", url: "https://brutalist.report/topic/tech?limit=10" },
      { id: "lnk-business-news", name: "business_news", url: "https://brutalist.report/topic/business?limit=10" },
      { id: "lnk-gaming-news", name: "gaming_news", url: "https://brutalist.report/topic/gaming?limit=10" },
      { id: "lnk-r-polska", name: "/r/polska", url: "https://www.reddit.com/r/Polska/" },
    ],
  },
  {
    id: "cat-shopping",
    category: "Shopping",
    color: "cyan",
    icon: "shopping-cart",
    items: [
      { id: "lnk-allegro", name: "allegro", url: "https://allegro.pl/" },
      { id: "lnk-olx", name: "olx", url: "https://www.olx.pl/" },
      { id: "lnk-etsy", name: "etsy", url: "https://www.etsy.com/" },
      { id: "lnk-emp-shop", name: "emp-shop", url: "https://www.emp-shop.pl/" },
      { id: "lnk-rockmetalshop", name: "rockmetalshop", url: "https://rockmetalshop.pl/" },
      { id: "lnk-kfd", name: "kfd", url: "https://sklep.kfd.pl/" },
    ],
  },
  {
    id: "cat-gaming",
    category: "Gaming",
    color: "blue",
    icon: "joystick",
    items: [
      { id: "lnk-r-gaming", name: "/r/gaming", url: "https://www.reddit.com/r/gaming/" },
      { id: "lnk-gry-online", name: "gry-online", url: "https://www.gry-online.pl/" },
      { id: "lnk-gog", name: "gog", url: "https://www.gog.com/" },
      { id: "lnk-steam", name: "steam", url: "https://store.steampowered.com/" },
    ],
  },
  {
    id: "cat-vip",
    category: "VIP List",
    color: "light-gray",
    icon: "star",
    items: [
      { id: "lnk-gynvael", name: "gynvael", url: "https://gynvael.coldwind.pl/" },
      { id: "lnk-network-chuck", name: "network_chuck", url: "https://learn.networkchuck.com/" },
      { id: "lnk-ippsec", name: "ippsec", url: "https://www.youtube.com/@ippsec/videos" },
      { id: "lnk-hammond", name: "hammond", url: "https://www.youtube.com/@_JohnHammond/videos" },
    ],
  },
  {
    id: "cat-homelab",
    category: "Home lab",
    color: "green",
    icon: "server",
    items: [
      { id: "lnk-homelab-dashboard", name: "homelab dashboard", url: "http://dashboard.lan" },
      { id: "lnk-bookmarks", name: "bookmarks", url: "http://linkding.lan" },
      { id: "lnk-dns", name: "dns", url: "http://adguard.lan" },
      { id: "lnk-proxy", name: "proxy manager", url: "http://nginx.lan" },
      { id: "lnk-cyberchef-lan", name: "cyberchef", url: "http://cyberchef.lan" },
      { id: "lnk-speedtest", name: "speedtest", url: "http://speed.lan" },
      { id: "lnk-portainer", name: "portainer", url: "http://portainer.lan" },
      { id: "lnk-torrent-lan", name: "torrent", url: "http://torrent.lan" },
      { id: "lnk-gitea", name: "gitea", url: "http://gitea.lan" },
      { id: "lnk-n8n", name: "n8n", url: "http://n8n.lan" },
    ],
  },
  {
    id: "cat-ctfs",
    category: "CTFs",
    color: "red",
    icon: "flag",
    items: [
      { id: "lnk-cyberchef", name: "CyberChef", url: "https://gchq.github.io/CyberChef/" },
      { id: "lnk-hex", name: "Hex", url: "https://hexed.it/" },
      { id: "lnk-online-converter", name: "OnlineConverter", url: "https://www.rapidtables.com/convert/number/ascii-hex-bin-dec-converter.html" },
      { id: "lnk-xor", name: "XOR", url: "https://xor.pw/" },
      { id: "lnk-regex", name: "Regex", url: "https://www.debuggex.com/" },
      { id: "lnk-ascii", name: "ASCII", url: "https://www.asciitable.com/" },
      { id: "lnk-quipquip", name: "QuipQuip", url: "https://quipqiup.com/" },
      { id: "lnk-crackstation", name: "Crackstation", url: "https://crackstation.net/" },
      { id: "lnk-pentestbook", name: "PentestBook", url: "https://pentestbook.six2dez.com/" },
      { id: "lnk-practical-ctf", name: "Practical CTF", url: "https://book.jorianwoltjer.com/" },
      { id: "lnk-john-ermac", name: "john_ermac", url: "https://johnermac.github.io/menu/" },
    ],
  },
  {
    id: "cat-pentest-knowledge",
    category: "Pentest knowledge",
    color: "gray",
    icon: "shield",
    items: [
      { id: "lnk-nthw", name: "NTHW", url: "https://github.com/notthehiddenwiki/NTHW" },
      { id: "lnk-exploit-notes", name: "Exploit notes", url: "https://exploit-notes.hdks.org/" },
      { id: "lnk-security-links", name: "SecurityLinks", url: "https://security-links.hdks.org/" },
      { id: "lnk-praetorian", name: "Praetorian", url: "https://www.praetorian.com/blog/" },
      { id: "lnk-hibp", name: "haveibeenpwned", url: "https://haveibeenpwned.com/" },
      { id: "lnk-r-blackhat", name: "/r/blackhat", url: "https://www.reddit.com/r/blackhat/?rdt=35278" },
      { id: "lnk-zenarmor", name: "zenarmor", url: "https://www.zenarmor.com/docs/network-security-tutorials/best-firewalls-for-schools" },
      { id: "lnk-cuckoo", name: "cuckoo", url: "https://sandbox.pikker.ee/" },
      { id: "lnk-canary-tokens", name: "canary_tokens", url: "https://canarytokens.org/nest/" },
      { id: "lnk-html-spec", name: "HTML Standard", url: "https://html.spec.whatwg.org/multipage/parsing.html" },
      { id: "lnk-webgoat", name: "WebGoat", url: "https://github.com/WebGoat/WebGoat?tab=readme-ov-file" },
      { id: "lnk-mxss-cheat", name: "mXSS cheatsheet", url: "https://sonarsource.github.io/mxss-cheatsheet/" },
      { id: "lnk-owasp-cheat", name: "OWASP cheatsheet", url: "https://cheatsheetseries.owasp.org/index.html" },
      { id: "lnk-haax-cheat", name: "Offensive Sec cheatsheet", url: "https://cheatsheet.haax.fr/" },
      { id: "lnk-xss-rat-notes", name: "XSS rat", url: "https://thexssrat.notion.site/Uncle-rat-s-notes-0ca25196b8c84147bf35a5c84d6b18de" },
      { id: "lnk-awesome-bugbounty", name: "Awesome BugBounty", url: "https://github.com/fardeen-ahmed/Bug-bounty-Writeups" },
      { id: "lnk-hacker-recipes", name: "HackerRecipes", url: "https://www.thehacker.recipes/" },
      { id: "lnk-red-team-notes", name: "Red Team Notes", url: "https://www.ired.team/" },
      { id: "lnk-red-team-llm", name: "Red Team LLM", url: "https://cph-sec.gitbook.io/ai-llm-red-team-handbook-and-field-manual" },
    ],
  },
  {
    id: "cat-sport",
    category: "Sport",
    color: "purple",
    icon: "activity",
    items: [
      { id: "lnk-buganski", name: "Bugański", url: "https://czlowiekuruszsie.pl/" },
    ],
  },
  {
    id: "cat-books",
    category: "Books & Knowledge",
    color: "blue",
    icon: "book",
    items: [
      { id: "lnk-annas-archive", name: "Anna's Archive", url: "https://pl.annas-archive.org/" },
      { id: "lnk-btdigg", name: "BTDigg", url: "https://btdig.com/" },
      { id: "lnk-libgen-fiction", name: "Polish fiction", url: "https://libgen.is/fiction/?q=&criteria=&language=Polish&format=" },
      { id: "lnk-libgen-nonfiction", name: "Polish non-fiction", url: "https://libgen.is/search.php?&req=polish&phrase=1&view=simple&column=language&sort=id&sortmode=DESC" },
      { id: "lnk-libgen-it", name: "Polish IT", url: "https://libgen.is/search.php?&req=Helion&phrase=1&view=simple&column=publisher&sort=id&sortmode=DESC&page=2" },
    ],
  },
];
```

- [ ] **Step 2: Update `js/render/grid.js` to read array items**

In `js/render/grid.js`, change every `Object.entries(cat.items).forEach(([name, url]) => {...})` to `cat.items.forEach((item) => {...})` and use `item.name`, `item.url`.

Updated `renderSearchResults` block:

```js
function renderSearchResults(root, query) {
  const matches = [];
  dataRef.forEach((cat) => {
    cat.items.forEach((item) => {
      if (
        item.name.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
      ) {
        matches.push(item);
      }
    });
  });
  if (matches.length === 0) {
    root.innerHTML = `<div class="empty-state">No results found for "${stateRef.searchQuery}"</div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid-view";
  matches.forEach((m) => grid.appendChild(renderLinkCard(m.name, m.url)));
  root.appendChild(grid);
}
```

Updated main render loop block:

```js
filtered.forEach((cat) => {
  const section = document.createElement("section");
  section.className = "category-section";

  const header = document.createElement("h2");
  header.className = `category-header ${cat.color}`;
  header.innerHTML = `<span class="cat-dot"></span>${cat.category}`;

  const grid = document.createElement("div");
  grid.className = "grid-view";

  cat.items.forEach((item) => {
    grid.appendChild(renderLinkCard(item.name, item.url));
  });

  section.append(header, grid);
  root.appendChild(grid && section); // append section (kept for clarity)
  root.appendChild(section);
});
```

Note: replace your existing `filtered.forEach` block fully with the version above (delete the old `section.append(header, grid); root.appendChild(section);` lines first to avoid double-append). The cleaner version:

```js
filtered.forEach((cat) => {
  const section = document.createElement("section");
  section.className = "category-section";

  const header = document.createElement("h2");
  header.className = `category-header ${cat.color}`;
  header.innerHTML = `<span class="cat-dot"></span>${cat.category}`;

  const grid = document.createElement("div");
  grid.className = "grid-view";

  cat.items.forEach((item) => {
    grid.appendChild(renderLinkCard(item.name, item.url));
  });

  section.append(header, grid);
  root.appendChild(section);
});
```

- [ ] **Step 3: Verify**

Reload. Expected: all categories render with all links, identical order to before. Search still works. Open one Polish link (e.g., `wykop`) to confirm UTF-8 names render fine.

- [ ] **Step 4: Commit**

```bash
git add js/shortcuts.js js/render/grid.js
git commit -m "refactor(shortcuts): normalize seed to arrays with stable ids"
```

### Task 2.2: Create storage module

**Files:**
- Create: `js/storage.js`

- [ ] **Step 1: Write `js/storage.js`**

```js
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
```

- [ ] **Step 2: Verify (no UI change yet)**

Open DevTools console. Run:

```js
const s = await import("./js/storage.js");
const o = s.load();
console.log(o);
```

Expected: returns the `EMPTY_OVERLAY` shape with `schemaVersion: 1`. No errors.

- [ ] **Step 3: Commit**

```bash
git add js/storage.js
git commit -m "feat(storage): add localStorage overlay loader + migrations"
```

### Task 2.3: Create data merge module

**Files:**
- Create: `js/data.js`

- [ ] **Step 1: Write `js/data.js`**

```js
// js/data.js
// Merges seed (shortcuts.js) + overlay into effective categories+links.

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

// Build a flat map of all seed link ids → category id (used for moves).
function indexSeed(seed) {
  const linkIdToCat = new Map();
  seed.forEach((cat) => {
    cat.items.forEach((it) => linkIdToCat.set(it.id, cat.id));
  });
  return linkIdToCat;
}

export function merge(seed, overlay) {
  // 1. Start with seed (cloned so we don't mutate it)
  let categories = clone(seed);

  // 2. Drop deleted categories
  const deletedCats = new Set(overlay.deleted?.categories || []);
  categories = categories.filter((c) => !deletedCats.has(c.id));

  // 3. Apply category edits (shallow merge)
  const catEdits = overlay.edited?.categories || {};
  categories.forEach((c) => {
    if (catEdits[c.id]) Object.assign(c, catEdits[c.id]);
  });

  // 4 + 5. Drop deleted links + apply link edits (including categoryId moves)
  const deletedLinks = new Set(overlay.deleted?.links || []);
  const linkEdits = overlay.edited?.links || {};

  // Collect moved links to re-place
  const movedLinks = [];
  categories.forEach((c) => {
    c.items = c.items.filter((l) => !deletedLinks.has(l.id));
    c.items.forEach((l) => {
      if (linkEdits[l.id]) Object.assign(l, linkEdits[l.id]);
    });
    // Pull out any links whose edited categoryId differs from current
    c.items = c.items.filter((l) => {
      if (linkEdits[l.id]?.categoryId && linkEdits[l.id].categoryId !== c.id) {
        movedLinks.push(l);
        return false;
      }
      return true;
    });
  });

  // Re-place moved links into their new home category
  movedLinks.forEach((l) => {
    const target = categories.find((c) => c.id === linkEdits[l.id].categoryId);
    if (target) target.items.push(l);
  });

  // 6a. Append added categories
  (overlay.added?.categories || []).forEach((c) => {
    if (deletedCats.has(c.id)) return; // delete wins over add (re-add after delete is rare)
    categories.push(clone(c));
  });

  // 6b. Append added links into their categories
  const addedLinks = overlay.added?.links || {};
  Object.entries(addedLinks).forEach(([catId, links]) => {
    const target = categories.find((c) => c.id === catId);
    if (!target) return;
    links.forEach((l) => {
      if (!deletedLinks.has(l.id)) target.items.push(clone(l));
    });
  });

  // 7. Reorder categories
  const catOrder = overlay.order?.categories || [];
  if (catOrder.length) {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const ordered = [];
    catOrder.forEach((id) => {
      if (byId.has(id)) {
        ordered.push(byId.get(id));
        byId.delete(id);
      }
    });
    // unknown ids (newly added in seed) appended at end
    byId.forEach((c) => ordered.push(c));
    categories = ordered;
  }

  // 7b. Reorder links within each category
  const linkOrder = overlay.order?.links || {};
  categories.forEach((c) => {
    const order = linkOrder[c.id];
    if (!order || !order.length) return;
    const byId = new Map(c.items.map((l) => [l.id, l]));
    const ordered = [];
    order.forEach((id) => {
      if (byId.has(id)) {
        ordered.push(byId.get(id));
        byId.delete(id);
      }
    });
    byId.forEach((l) => ordered.push(l));
    c.items = ordered;
  });

  return categories;
}

export function findLink(categories, linkId) {
  for (const c of categories) {
    for (const l of c.items) {
      if (l.id === linkId) return { category: c, link: l };
    }
  }
  return null;
}
```

- [ ] **Step 2: Verify in DevTools**

```js
const seed = (await import("./js/shortcuts.js")).default;
const storage = await import("./js/storage.js");
const { merge } = await import("./js/data.js");
const overlay = storage.load();
const out = merge(seed, overlay);
console.log("Categories:", out.length, "First cat:", out[0].category, "First link:", out[0].items[0]);
```

Expected: `Categories: 17 First cat: Main First link: {id: "lnk-gmail", name: "gmail", url: "..."}`.

- [ ] **Step 3: Commit**

```bash
git add js/data.js
git commit -m "feat(data): add seed+overlay merge function"
```

### Task 2.4: Wire storage + merge into main.js

**Files:**
- Modify: `js/main.js`, `js/render/grid.js`, `js/render/sidebar.js`

- [ ] **Step 1: Rewrite `js/main.js` to use merged data**

Replace `js/main.js` entirely:

```js
// js/main.js
// App entry point. Loads overlay, merges with seed, wires modules.

import seed from "./shortcuts.js";
import { load as loadOverlay, save as saveOverlay, migrateLegacyFavorites } from "./storage.js";
import { merge } from "./data.js";
import { clearExpiredFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";
import { initSidebar, setActive as setSidebarActive } from "./render/sidebar.js";
import { initGrid, setData as setGridData, setState as setGridState } from "./render/grid.js";

let overlay = loadOverlay();
overlay = migrateLegacyFavorites(overlay, seed);
saveOverlay(overlay);

let categories = merge(seed, overlay);

const state = {
  activeCategory: "all",
  searchQuery: "",
  favorites: new Set(overlay.favorites || []),
};

function selectCategory(cat) {
  state.activeCategory = cat;
  setSidebarActive(cat);
  setGridState({ activeCategory: cat });
}

function toggleFavorite(linkId) {
  if (state.favorites.has(linkId)) state.favorites.delete(linkId);
  else state.favorites.add(linkId);
  overlay.favorites = [...state.favorites];
  saveOverlay(overlay);
  setGridState({});
}

clearExpiredFavicons();
initTheme();
startClock(overlay.settings?.username || "Marcin");
initSidebar({
  data: categories,
  activeCategory: state.activeCategory,
  onCategorySelect: selectCategory,
});
initGrid({
  data: categories,
  state,
  onToggleFavorite: toggleFavorite,
});

document.querySelector('[data-cat="all"]').onclick = () => selectCategory("all");

const filterInput = document.getElementById("filter");
filterInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  setGridState({ searchQuery: state.searchQuery });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== filterInput) {
    e.preventDefault();
    filterInput.focus();
  }
});

// Expose for later phases (settings panel will call these)
export function refreshData() {
  categories = merge(seed, overlay);
  setGridData(categories);
}

export function getOverlay() {
  return overlay;
}

export function persistOverlay() {
  saveOverlay(overlay);
}
```

- [ ] **Step 2: Update `js/render/grid.js` favorites lookup**

In `js/render/grid.js`, `renderLinkCard` currently uses `url` as the favorite key. Change to use link id. Replace the function:

```js
function renderLinkCard(item) {
  const card = document.createElement("a");
  card.href = item.url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.dataset.linkId = item.id;

  const icon = document.createElement("img");
  icon.src = getFavicon(item.url);
  icon.loading = "lazy";

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = item.name;

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(item.id) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(item.id);
  };

  card.append(icon, title, favBtn);
  return card;
}
```

And update its call sites in the same file:

```js
cat.items.forEach((item) => {
  grid.appendChild(renderLinkCard(item));
});
```

and

```js
matches.forEach((m) => grid.appendChild(renderLinkCard(m)));
```

- [ ] **Step 3: Verify**

Reload. Expected: app identical to before. Open DevTools → Application → Local Storage → `startpage_overlay_v1` key exists with default shape. Old `favorites` key (if it existed) is gone. Click ★ on a card — persists; reload — still favorited.

- [ ] **Step 4: Commit**

```bash
git add js/main.js js/render/grid.js
git commit -m "feat(data): wire overlay + merge into main; migrate legacy favorites"
```

---

## Phase 3 — Visual polish

Apply the spec's typography, spacing, color, and animation refinements. Layout (sidebar + grid) unchanged.

### Task 3.1: Swap font to Geist + retune type scale

**Files:**
- Modify: `index.html`, `styles/main.css`

- [ ] **Step 1: Replace font link in `index.html`**

In `index.html` `<head>`, no current font link tag exists (Inter is imported via CSS `@import`). We'll keep it as a `<link>` for faster preconnect.

Add inside `<head>` (above the stylesheet link):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Update `styles/main.css` font family + type scale**

In `styles/main.css`:

Replace the top `@import` line with nothing (delete it — fonts now come from `<link>`).

Replace the `body` `font-family` declaration:

```css
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-app);
  color: var(--text-main);
  font-family: "Geist", "Inter", system-ui, sans-serif;
  font-feature-settings: "ss01", "cv11";
  overflow: hidden;
  transition: var(--theme-transition);
  line-height: 1.4;
}
```

Update the `:root` block — add the mono font variable next to dimensions:

```css
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

Update `.greeting-wrap h1`:

```css
.greeting-wrap h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
  background: linear-gradient(to right, var(--text-main), var(--text-muted));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Update `.greeting-wrap p`:

```css
.greeting-wrap p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}
```

Update `.timer-wrap` to use mono:

```css
.timer-wrap {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-weight: 600;
  font-size: 0.875rem;
}
```

Update `.category-header`:

```css
.category-header {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
```

Update `.link-title`:

```css
.link-title {
  font-weight: 500;
  font-size: 0.875rem;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 3: Verify**

Reload. Expected: text renders in Geist (cleaner, more rectangular than Inter). Clock + date are tighter. Category headers smaller + wider-tracked. No layout breakage.

- [ ] **Step 4: Commit**

```bash
git add index.html styles/main.css
git commit -m "style: swap to Geist + retune type scale"
```

### Task 3.2: Update color tokens + spacing

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Replace `:root` dark theme variables**

In `styles/main.css`, replace the `:root` block entirely:

```css
:root {
  /* Background */
  --bg-app: #020617;
  --bg-sidebar: rgba(15, 23, 42, 0.4);
  --bg-content: radial-gradient(circle at 50% 0%, #0f172a 0%, #020617 60%);

  /* Surface scale (consistent across themes) */
  --surface-1: rgba(148, 163, 184, 0.04);
  --surface-2: rgba(148, 163, 184, 0.08);
  --surface-3: rgba(148, 163, 184, 0.12);
  --surface-hover: rgba(148, 163, 184, 0.10);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-highlight: rgba(255, 255, 255, 0.12);

  /* Text */
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  --text-dim: #64748b;

  /* Accent */
  --accent-primary: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.4);

  /* Dimensions */
  --sidebar-width: 240px;
  --header-height: 80px;
  --radius-xl: 20px;
  --radius-lg: 12px;
  --radius-md: 10px;

  /* Fonts */
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  /* Effects */
  --blur-glass: 20px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  --shadow-accent: 0 8px 24px -8px rgba(99, 102, 241, 0.4);
  --transition: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --theme-transition:
    background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease,
    box-shadow 0.3s ease;
}
```

- [ ] **Step 2: Replace light-theme overrides**

```css
[data-theme="light"] {
  --bg-app: #fafaf9;
  --bg-sidebar: rgba(255, 255, 255, 0.7);
  --bg-content: radial-gradient(circle at 50% 0%, #e0e7ff 0%, #fafaf9 60%);

  --surface-1: rgba(15, 23, 42, 0.03);
  --surface-2: rgba(15, 23, 42, 0.06);
  --surface-3: rgba(15, 23, 42, 0.10);
  --surface-hover: rgba(15, 23, 42, 0.08);

  --border-subtle: rgba(15, 23, 42, 0.06);
  --border-highlight: rgba(15, 23, 42, 0.12);

  --text-main: #0f172a;
  --text-muted: #475569;
  --text-dim: #94a3b8;

  --accent-primary: #4f46e5;
  --accent-glow: rgba(79, 70, 229, 0.2);

  --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
  --shadow-accent: 0 8px 24px -8px rgba(79, 70, 229, 0.35);
}
```

- [ ] **Step 3: Update `.sidebar` width + padding**

```css
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  backdrop-filter: blur(var(--blur-glass));
  display: flex;
  flex-direction: column;
  padding: 1.25rem 0.75rem;
  z-index: 20;
  transition: var(--theme-transition);
}
```

Update `.nav-item`:

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition);
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  width: 100%;
}
```

Update `.header`:

```css
.header {
  height: auto;
  min-height: 96px;
  padding: 1.5rem 2rem 0.75rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
  z-index: 10;
}
```

Update `.view-container`:

```css
.view-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 2rem 3rem;
  scrollbar-width: thin;
  scrollbar-color: var(--surface-2) transparent;
}
```

Update `.category-section`:

```css
.category-section {
  margin-bottom: 2.5rem;
}
```

- [ ] **Step 4: Verify**

Reload. Expected: background a touch darker (slate-950), sidebar narrower (240px), category-section gap tighter, padding everywhere reduced ~15%. Light theme: warmer cream-white background, indigo accent.

- [ ] **Step 5: Commit**

```bash
git add styles/main.css
git commit -m "style: tighten spacing + retune color tokens (slate-950 dark, stone-50 light)"
```

### Task 3.3: Card + dot + sidebar polish

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Update `.cat-dot` for soft glow**

```css
.cat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
  opacity: 0.9;
}
```

- [ ] **Step 2: Replace `.link-card` block**

Delete the existing `.link-card`, `.link-card:hover`, `.link-card img`, `.link-card::after`, and `.link-card:hover::after` blocks. Replace with:

```css
.link-card {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.75rem 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--text-muted);
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}

.link-card:hover {
  background: var(--surface-2);
  border-color: var(--border-highlight);
  color: var(--text-main);
  box-shadow: var(--shadow-accent);
}

.link-card:hover .link-favicon {
  transform: translateY(-1px);
}

.link-favicon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--transition);
}

.link-favicon img {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: contain;
}
```

- [ ] **Step 3: Update `js/render/grid.js` to wrap favicon img in container**

In `js/render/grid.js`, update `renderLinkCard`:

```js
function renderLinkCard(item) {
  const card = document.createElement("a");
  card.href = item.url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.dataset.linkId = item.id;

  const faviconWrap = document.createElement("div");
  faviconWrap.className = "link-favicon";
  const icon = document.createElement("img");
  icon.src = getFavicon(item.url);
  icon.loading = "lazy";
  icon.alt = "";
  icon.onerror = () => {
    faviconWrap.innerHTML = "";
    const letter = document.createElement("span");
    letter.textContent = (item.name[0] || "?").toUpperCase();
    letter.style.color = "var(--text-main)";
    letter.style.fontWeight = "600";
    letter.style.fontSize = "12px";
    faviconWrap.appendChild(letter);
  };
  faviconWrap.appendChild(icon);

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = item.name;
  title.title = item.name;

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(item.id) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(item.id);
  };

  card.append(faviconWrap, title, favBtn);
  return card;
}
```

- [ ] **Step 4: Replace `.fav-btn` opacity behavior**

```css
.fav-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.3;
  transition: var(--transition);
  display: flex;
}

.link-card:hover .fav-btn {
  opacity: 1;
}

.fav-btn:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
}

.fav-btn.active {
  opacity: 1;
  color: #fbbf24;
}
```

- [ ] **Step 5: Replace `.nav-item.active` block in the V3 Polish section**

Find the second `.nav-item.active` block in the V3 Polish section near the bottom (with the gradient + text-shadow combo). Replace with just:

```css
.nav-item.active {
  background: var(--surface-2);
  color: var(--text-main);
  box-shadow: inset 3px 0 0 var(--accent-primary);
}

.nav-item.active .icon {
  opacity: 1;
  color: var(--accent-primary);
}

.nav-item:hover .icon {
  transform: translateX(1px);
  transition: transform var(--transition);
}
```

(Delete the older `.nav-item.active` block earlier in the file too — only this single declaration should remain.)

- [ ] **Step 6: Verify**

Reload. Expected: cards have proper favicon container (no more bare img). Stars faintly visible at rest, brighten on hover. Sidebar active state cleaner (no text-shadow glow, no gradient). Category dots glow softly.

- [ ] **Step 7: Commit**

```bash
git add styles/main.css js/render/grid.js
git commit -m "style: polish cards, favicon container, sidebar active, star button"
```

### Task 3.4: Replace animations

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Delete the staggered cascade + sheen sweep + replace with calm fade**

Find and delete these blocks from `styles/main.css`:
- `.link-card::after { … }` (already deleted in 3.3)
- `.link-card:hover::after { … }` (already deleted in 3.3)
- All `.category-section:nth-child(N)` `animation-delay` rules
- `.category-section { animation: slideUpFade … }` rule
- `@keyframes slideUpFade { … }`
- The first `.category-section { … animation: fadeIn … }` rule

Keep `@keyframes fadeIn` (we still use it) but redefine if it doesn't translate:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Add a calm view-container fade:

```css
.view-container {
  animation: fadeIn 0.2s ease-out;
}

.category-section {
  margin-bottom: 2.5rem;
}
```

(If a duplicate `.category-section` rule already exists, merge — keep only one with `margin-bottom`.)

- [ ] **Step 2: Verify**

Reload. Switch between sidebar categories rapidly. Expected: content area fades in calmly each time, no staggered cascade, no sheen sweep on card hover. Theme toggle still spins.

- [ ] **Step 3: Commit**

```bash
git add styles/main.css
git commit -m "style: replace staggered cascade + sheen with single calm fade"
```

---

## Phase 4 — Modal primitive + toast

Reusable modal and toast components used by every CRUD UI in subsequent phases.

### Task 4.1: Create modal + toast module

**Files:**
- Create: `js/crud/modal.js`
- Modify: `styles/main.css`

- [ ] **Step 1: Write `js/crud/modal.js`**

```js
// js/crud/modal.js
// Generic modal + toast primitives. No deps.

let openModalEl = null;
let escListener = null;

export function openModal({ title, body, footer, onClose, width }) {
  closeModal();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  if (width) dialog.style.maxWidth = width;

  const header = document.createElement("div");
  header.className = "modal-header";
  const h = document.createElement("h2");
  h.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = closeModal;
  header.append(h, closeBtn);

  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  dialog.append(header, bodyEl);

  if (footer) {
    const footerEl = document.createElement("div");
    footerEl.className = "modal-footer";
    if (typeof footer === "string") footerEl.innerHTML = footer;
    else if (footer instanceof Node) footerEl.appendChild(footer);
    dialog.appendChild(footerEl);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  openModalEl = backdrop;

  escListener = (e) => {
    if (e.key === "Escape") closeModal();
  };
  document.addEventListener("keydown", escListener);

  // focus first input if any
  setTimeout(() => {
    const first = dialog.querySelector("input, select, textarea, button");
    if (first) first.focus();
  }, 0);

  if (onClose) backdrop.dataset.onClose = "1";
  backdrop._onClose = onClose;

  return { dialog, body: bodyEl, close: closeModal };
}

export function closeModal() {
  if (!openModalEl) return;
  const cb = openModalEl._onClose;
  openModalEl.remove();
  openModalEl = null;
  if (escListener) {
    document.removeEventListener("keydown", escListener);
    escListener = null;
  }
  if (cb) cb();
}

export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.gap = "0.5rem";
    footer.style.justifyContent = "flex-end";

    const cancel = document.createElement("button");
    cancel.className = "btn";
    cancel.textContent = "Cancel";
    cancel.onclick = () => {
      closeModal();
      resolve(false);
    };

    const ok = document.createElement("button");
    ok.className = danger ? "btn btn-danger" : "btn btn-primary";
    ok.textContent = confirmLabel;
    ok.onclick = () => {
      closeModal();
      resolve(true);
    };

    footer.append(cancel, ok);
    openModal({ title, body: `<p>${message}</p>`, footer, width: "420px" });
  });
}

// --- Toast ---

let toastRoot = null;

function getToastRoot() {
  if (toastRoot) return toastRoot;
  toastRoot = document.createElement("div");
  toastRoot.className = "toast-root";
  document.body.appendChild(toastRoot);
  return toastRoot;
}

export function toast(message, kind = "info", duration = 3500) {
  const root = getToastRoot();
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  root.appendChild(el);
  // trigger enter animation on next frame
  requestAnimationFrame(() => el.classList.add("toast-visible"));
  setTimeout(() => {
    el.classList.remove("toast-visible");
    setTimeout(() => el.remove(), 300);
  }, duration);
}
```

- [ ] **Step 2: Append modal + toast styles to `styles/main.css`**

Append to the bottom of `styles/main.css`:

```css
/* --- Modal --- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.15s ease-out;
}

.modal-dialog {
  background: var(--bg-app);
  border: 1px solid var(--border-highlight);
  border-radius: var(--radius-xl);
  width: 92%;
  max-width: 520px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-main);
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  border-radius: 4px;
  transition: var(--transition);
}

.modal-close:hover {
  color: var(--text-main);
  background: var(--surface-2);
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  color: var(--text-main);
}

.modal-footer {
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* --- Form primitives --- */
.field {
  margin-bottom: 0.875rem;
}

.field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 0.375rem;
}

.field input[type="text"],
.field input[type="url"],
.field input[type="password"],
.field select,
.field textarea {
  width: 100%;
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  color: var(--text-main);
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  transition: var(--transition);
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
  background: var(--surface-2);
}

.field .error {
  color: #fb7185;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.field input.invalid,
.field select.invalid {
  border-color: #fb7185;
}

.btn {
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.btn:hover {
  background: var(--surface-3);
  border-color: var(--border-highlight);
}

.btn-primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-danger {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
}

.btn-danger:hover {
  filter: brightness(1.1);
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-muted);
}

.btn-ghost:hover {
  background: var(--surface-2);
  color: var(--text-main);
}

/* --- Toast --- */
.toast-root {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 200;
  pointer-events: none;
}

.toast {
  background: var(--surface-3);
  border: 1px solid var(--border-highlight);
  color: var(--text-main);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 500;
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: auto;
  max-width: 360px;
}

.toast-visible {
  opacity: 1;
  transform: translateY(0);
}

.toast-error {
  border-color: #fb7185;
  color: #fda4af;
}

.toast-success {
  border-color: #4ade80;
  color: #86efac;
}
```

- [ ] **Step 3: Smoke test in DevTools**

Reload page. In console:

```js
const m = await import("./js/crud/modal.js");
m.openModal({ title: "Test", body: "<p>Hello</p>", width: "400px" });
```

Expected: modal opens centered, backdrop blurs background, Esc closes, clicking backdrop closes. Then:

```js
m.toast("Hello", "success");
m.toast("Oops", "error");
```

Expected: two toasts bottom-right, success green border, error red border, both auto-dismiss after ~3.5s.

- [ ] **Step 4: Commit**

```bash
git add js/crud/modal.js styles/main.css
git commit -m "feat(modal): add reusable modal + toast + form primitives"
```

---

## Phase 5 — Settings panel

Settings panel reachable via gear icon in sidebar footer. Covers username, theme reference, default search engine, weather setup form, and data import/export/reset.

### Task 5.1: Add engines registry

**Files:**
- Create: `js/engines.js`

- [ ] **Step 1: Write `js/engines.js`**

```js
// js/engines.js
// Search engine registry. Built-ins + user-added customs.

export const BUILTIN_ENGINES = [
  { key: "ddg",    label: "DuckDuckGo", urlTemplate: "https://duckduckgo.com/?q=%s" },
  { key: "google", label: "Google",     urlTemplate: "https://www.google.com/search?q=%s" },
  { key: "bing",   label: "Bing",       urlTemplate: "https://www.bing.com/search?q=%s" },
  { key: "kagi",   label: "Kagi",       urlTemplate: "https://kagi.com/search?q=%s" },
];

// Default prefix-shortcuts (user can override via customs).
export const DEFAULT_PREFIXES = [
  { key: "g",  label: "Google",  urlTemplate: "https://www.google.com/search?q=%s" },
  { key: "d",  label: "DuckDuckGo", urlTemplate: "https://duckduckgo.com/?q=%s" },
  { key: "y",  label: "YouTube", urlTemplate: "https://www.youtube.com/results?search_query=%s" },
  { key: "gh", label: "GitHub",  urlTemplate: "https://github.com/search?q=%s" },
];

export function getAllEngines(overlay) {
  const customs = (overlay.settings?.customEngines || []).map((e) => ({ ...e, custom: true }));
  return [...BUILTIN_ENGINES, ...customs];
}

export function getAllPrefixes(overlay) {
  const customs = overlay.settings?.customEngines || [];
  // customs participate as both engine + prefix (key is the prefix)
  return [...DEFAULT_PREFIXES, ...customs];
}

export function resolveEngine(key, overlay) {
  return getAllEngines(overlay).find((e) => e.key === key) || BUILTIN_ENGINES[0];
}

export function searchUrl(template, query) {
  return template.replace("%s", encodeURIComponent(query));
}

// Returns {prefix, query} if query starts with a known prefix, else null.
export function detectPrefix(query, overlay) {
  const m = /^(\S+)\s+(.+)$/.exec(query);
  if (!m) return null;
  const [, p, rest] = m;
  const all = getAllPrefixes(overlay);
  const match = all.find((e) => e.key === p);
  if (!match) return null;
  return { prefix: match, query: rest };
}
```

- [ ] **Step 2: Commit (no UI yet)**

```bash
git add js/engines.js
git commit -m "feat(engines): add search engine registry"
```

### Task 5.2: Add settings button to sidebar + open settings panel

**Files:**
- Modify: `index.html`, `js/main.js`
- Create: `js/crud/settings.js`

- [ ] **Step 1: Add settings + help buttons to `index.html` sidebar footer**

In `index.html`, replace the `<div class="sidebar-footer">…</div>` block with:

```html
<div class="sidebar-footer">
  <button id="help-toggle" class="nav-item" title="Help (?)">
    <span class="icon">?</span>
    <span class="label">Help</span>
  </button>
  <button id="settings-toggle" class="nav-item" title="Settings">
    <span class="icon">⚙</span>
    <span class="label">Settings</span>
  </button>
  <button id="theme-toggle" class="nav-item" title="Toggle Theme">
    <span class="icon">◑</span>
    <span class="label">Theme</span>
  </button>
</div>
```

- [ ] **Step 2: Create `js/crud/settings.js`**

```js
// js/crud/settings.js
// Settings panel: username, default engine, custom engines, weather config, import/export/reset.

import { openModal, closeModal, confirmDialog, toast } from "./modal.js";
import { BUILTIN_ENGINES } from "../engines.js";
import { reset as resetStorage, save as saveOverlay } from "../storage.js";

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
        <button class="btn btn-danger" id="set-full-reset">Full reset (incl. settings)</button>
      </div>
    </section>
  `;

  // Pre-fill values
  body.querySelector("#set-username").value = overlayRef.settings.username || "";
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
  body.querySelector("#set-add-engine").onclick = () => addCustomRow(body.querySelector("#set-customs"));

  body.querySelector("#set-weather-key").onchange = (e) => {
    overlayRef.settings.weather = { ...(overlayRef.settings.weather || {}), apiKey: e.target.value.trim() };
    persistAndNotify();
  };
  body.querySelector("#set-weather-units").onchange = (e) => {
    overlayRef.settings.weather = { ...(overlayRef.settings.weather || {}), units: e.target.value };
    persistAndNotify();
  };
  body.querySelector("#set-weather-loc").onblur = (e) => geocode(e.target.value, body);
  body.querySelector("#set-weather-test").onclick = () => testWeather(body);

  body.querySelector("#set-export").onclick = exportData;
  body.querySelector("#set-import").onclick = () => body.querySelector("#set-import-file").click();
  body.querySelector("#set-import-file").onchange = (e) => importData(e.target.files[0]);
  body.querySelector("#set-reset").onclick = resetData;
  body.querySelector("#set-full-reset").onclick = fullReset;

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
  row.innerHTML = `
    <input type="text" placeholder="prefix" value="${eng.key || ""}">
    <input type="text" placeholder="Label" value="${eng.label || ""}">
    <input type="url" placeholder="https://…/?q=%s" value="${eng.urlTemplate || ""}">
    <button class="btn btn-ghost" title="Remove">×</button>
  `;
  const [keyI, labelI, urlI, delBtn] = row.children;
  const persist = () => {
    const eng2 = {
      key: keyI.value.trim(),
      label: labelI.value.trim(),
      urlTemplate: urlI.value.trim(),
    };
    overlayRef.settings.customEngines[idx] = eng2;
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
  if (!overlayRef.settings.customEngines) overlayRef.settings.customEngines = [];
  overlayRef.settings.customEngines.push({ key: "", label: "", urlTemplate: "" });
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
  const blob = new Blob([JSON.stringify(overlayRef, null, 2)], { type: "application/json" });
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
    message: "This replaces all your current links, edits, favorites, and settings. Continue?",
    confirmLabel: "Replace",
    danger: true,
  });
  if (!ok) return;
  Object.assign(overlayRef, parsed);
  persistAndNotify();
  toast("Imported. Reloading…", "success");
  setTimeout(() => location.reload(), 600);
}

async function resetData() {
  const ok = await confirmDialog({
    title: "Reset to defaults",
    message: "Deletes all your added links, edits, deletions, reorderings, and favorites. Settings (theme, weather, engines, username) are kept.",
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

async function fullReset() {
  const ok = await confirmDialog({
    title: "Full reset",
    message: "Deletes EVERYTHING — links, edits, settings, theme, weather, engines. Cannot be undone.",
    confirmLabel: "Wipe everything",
    danger: true,
  });
  if (!ok) return;
  resetStorage();
  toast("Wiped. Reloading…", "success");
  setTimeout(() => location.reload(), 600);
}
```

- [ ] **Step 3: Wire settings into `js/main.js`**

In `js/main.js`, add import:

```js
import { initSettings } from "./crud/settings.js";
```

After the existing `initGrid(…)` call, add:

```js
initSettings({
  overlay,
  onChange: () => {
    refreshData();
  },
});
```

`refreshData()` already exported from `main.js` (added in Task 2.4). But note `refreshData` must also re-init the sidebar (categories may have changed). Update `refreshData`:

```js
export function refreshData() {
  categories = merge(seed, overlay);
  setGridData(categories);
  setSidebarData(categories, state.activeCategory);
}
```

Add `setSidebarData` import:

```js
import { initSidebar, setActive as setSidebarActive, setData as setSidebarData } from "./render/sidebar.js";
```

- [ ] **Step 4: Add `setData` export to `js/render/sidebar.js`**

In `js/render/sidebar.js`, after the existing `setActive` export, add:

```js
export function setData(data, activeCategory) {
  dataRef = data;
  if (activeCategory != null) activeCategoryRef = activeCategory;
  render();
}
```

- [ ] **Step 5: Append settings styles to `styles/main.css`**

```css
/* --- Settings panel --- */
.settings-body { color: var(--text-main); }
.settings-section { margin-bottom: 1.5rem; }
.settings-section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin: 0 0 0.75rem;
}
.settings-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0 0 0.625rem;
}
.settings-hint a { color: var(--accent-primary); }
```

- [ ] **Step 6: Verify**

Reload. Click ⚙ Settings in sidebar footer. Expected: modal opens with General / Search / Weather / Data sections. Change username → greeting updates immediately. Add custom engine row → fill prefix `gh`, label `GitHub`, URL `https://github.com/search?q=%s` → row persists across reload. Set default engine to Kagi → persists. Export JSON → file downloads. Import same file → confirm dialog, then page reloads with identical state.

- [ ] **Step 7: Commit**

```bash
git add js/crud/settings.js js/engines.js js/main.js js/render/sidebar.js styles/main.css index.html
git commit -m "feat(settings): add settings panel with username, engines, weather form, data ops"
```

---

## Phase 6 — Link editor (add / edit / delete)

### Task 6.1: Create link editor module

**Files:**
- Create: `js/crud/link-editor.js`

- [ ] **Step 1: Write `js/crud/link-editor.js`**

```js
// js/crud/link-editor.js
// Add / edit / delete a single link.

import { openModal, closeModal, confirmDialog, toast } from "./modal.js";
import { save as saveOverlay } from "../storage.js";
import { getFavicon } from "../favicons.js";

let overlayRef = null;
let categoriesRef = [];
let onChangeCb = null;

export function initLinkEditor({ overlay, getCategories, onChange }) {
  overlayRef = overlay;
  categoriesRef = getCategories();
  onChangeCb = () => {
    categoriesRef = getCategories();
    if (onChange) onChange();
  };
}

function persist() {
  saveOverlay(overlayRef);
  onChangeCb();
}

function makeLinkId(name) {
  const slug = (name || "link")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `lnk-user-${slug}-${Date.now().toString(36)}`;
}

export function openLinkEditor({ linkId = null, defaultCategoryId = null } = {}) {
  const isEdit = !!linkId;
  let existing = null;
  let existingCatId = null;
  if (isEdit) {
    for (const cat of categoriesRef) {
      const found = cat.items.find((l) => l.id === linkId);
      if (found) {
        existing = found;
        existingCatId = cat.id;
        break;
      }
    }
    if (!existing) {
      toast("Link not found.", "error");
      return;
    }
  }

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="field">
      <label>Name</label>
      <input id="lnk-name" type="text" maxlength="80" required>
      <div class="error" id="lnk-name-err" style="display:none">Name is required.</div>
    </div>
    <div class="field">
      <label>URL</label>
      <input id="lnk-url" type="url" placeholder="https://example.com" required>
      <div class="error" id="lnk-url-err" style="display:none"></div>
    </div>
    <div class="field">
      <label>Category</label>
      <select id="lnk-cat"></select>
    </div>
    <div class="field">
      <label>Preview</label>
      <div class="link-preview">
        <div class="link-favicon"><img id="lnk-preview-img" alt=""></div>
        <span id="lnk-preview-name" class="link-title">—</span>
      </div>
    </div>
  `;

  const nameI = body.querySelector("#lnk-name");
  const urlI = body.querySelector("#lnk-url");
  const catS = body.querySelector("#lnk-cat");
  const previewImg = body.querySelector("#lnk-preview-img");
  const previewName = body.querySelector("#lnk-preview-name");
  const nameErr = body.querySelector("#lnk-name-err");
  const urlErr = body.querySelector("#lnk-url-err");

  // populate category select
  categoriesRef.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.category;
    catS.appendChild(opt);
  });

  if (isEdit) {
    nameI.value = existing.name;
    urlI.value = existing.url;
    catS.value = existingCatId;
    previewName.textContent = existing.name;
    previewImg.src = getFavicon(existing.url);
  } else if (defaultCategoryId) {
    catS.value = defaultCategoryId;
  }

  const updatePreview = () => {
    previewName.textContent = nameI.value || "—";
    if (urlI.value) {
      try {
        new URL(urlI.value);
        previewImg.src = getFavicon(urlI.value);
      } catch {
        /* invalid url, leave previous */
      }
    }
  };

  let debounceT;
  urlI.addEventListener("input", () => {
    clearTimeout(debounceT);
    debounceT = setTimeout(updatePreview, 400);
  });
  nameI.addEventListener("input", updatePreview);

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "0.5rem";
  footer.style.justifyContent = "space-between";

  const leftGroup = document.createElement("div");
  if (isEdit) {
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      const ok = await confirmDialog({
        title: "Delete link",
        message: `Delete “${existing.name}”? Cannot be undone (until you Reset).`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
      deleteLink(existing.id);
      closeModal();
      toast("Deleted.", "success");
    };
    leftGroup.appendChild(delBtn);
  }

  const rightGroup = document.createElement("div");
  rightGroup.style.display = "flex";
  rightGroup.style.gap = "0.5rem";
  const cancel = document.createElement("button");
  cancel.className = "btn";
  cancel.textContent = "Cancel";
  cancel.onclick = closeModal;
  const save = document.createElement("button");
  save.className = "btn btn-primary";
  save.textContent = isEdit ? "Save" : "Add link";
  save.onclick = () => {
    const name = nameI.value.trim();
    const url = urlI.value.trim();
    nameErr.style.display = "none";
    urlErr.style.display = "none";
    nameI.classList.remove("invalid");
    urlI.classList.remove("invalid");

    let bad = false;
    if (!name) {
      nameErr.style.display = "block";
      nameI.classList.add("invalid");
      bad = true;
    }
    try {
      new URL(url);
    } catch (e) {
      urlErr.textContent = `Invalid URL: ${e.message}`;
      urlErr.style.display = "block";
      urlI.classList.add("invalid");
      bad = true;
    }
    if (bad) return;

    if (isEdit) {
      editLink(existing.id, existingCatId, { name, url, categoryId: catS.value });
    } else {
      addLink(catS.value, { id: makeLinkId(name), name, url });
    }
    closeModal();
    toast(isEdit ? "Saved." : "Link added.", "success");
  };
  rightGroup.append(cancel, save);

  footer.append(leftGroup, rightGroup);

  const modal = openModal({ title: isEdit ? "Edit link" : "New link", body, footer, width: "440px" });

  modal.dialog.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      save.click();
    }
  });
}

function addLink(catId, link) {
  if (!overlayRef.added.links[catId]) overlayRef.added.links[catId] = [];
  overlayRef.added.links[catId].push(link);
  persist();
}

function editLink(linkId, currentCatId, patch) {
  // If link is in `added`, mutate it directly (cleaner state).
  for (const catId in overlayRef.added.links) {
    const arr = overlayRef.added.links[catId];
    const idx = arr.findIndex((l) => l.id === linkId);
    if (idx !== -1) {
      if (patch.categoryId && patch.categoryId !== catId) {
        // move between added buckets
        const [moved] = arr.splice(idx, 1);
        Object.assign(moved, patch);
        if (!overlayRef.added.links[patch.categoryId])
          overlayRef.added.links[patch.categoryId] = [];
        overlayRef.added.links[patch.categoryId].push(moved);
      } else {
        Object.assign(arr[idx], patch);
      }
      persist();
      return;
    }
  }
  // Otherwise seed link — write to overlay.edited
  overlayRef.edited.links[linkId] = { ...(overlayRef.edited.links[linkId] || {}), ...patch };
  persist();
}

function deleteLink(linkId) {
  // If added: just remove from added bucket
  for (const catId in overlayRef.added.links) {
    const arr = overlayRef.added.links[catId];
    const idx = arr.findIndex((l) => l.id === linkId);
    if (idx !== -1) {
      arr.splice(idx, 1);
      // also remove from favorites
      overlayRef.favorites = overlayRef.favorites.filter((id) => id !== linkId);
      persist();
      return;
    }
  }
  // Seed link: add to deleted
  if (!overlayRef.deleted.links.includes(linkId)) {
    overlayRef.deleted.links.push(linkId);
  }
  overlayRef.favorites = overlayRef.favorites.filter((id) => id !== linkId);
  delete overlayRef.edited.links[linkId];
  persist();
}
```

- [ ] **Step 2: Append link-preview + FAB styles to `styles/main.css`**

```css
/* --- Link preview (in modal) --- */
.link-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: var(--surface-1);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

/* --- Floating add-link FAB --- */
.fab {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: none;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 300;
  cursor: pointer;
  box-shadow: var(--shadow-accent), 0 6px 20px rgba(0, 0, 0, 0.3);
  z-index: 50;
  transition: transform var(--transition);
}

.fab:hover { transform: translateY(-2px) scale(1.05); }

/* --- Edit pencil on link cards --- */
.edit-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: var(--transition);
  display: flex;
}

.link-card:hover .edit-btn { opacity: 0.6; }
.edit-btn:hover { opacity: 1 !important; color: var(--accent-primary); background: var(--surface-2); }
```

- [ ] **Step 3: Wire FAB + edit pencil into render/grid + main**

In `js/icons.js`, append two more icons inside the `ICONS` object (before the closing `};`):

```js
  pencil: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
```

In `js/render/grid.js`, update `renderLinkCard` to add an edit pencil between title and star. Add `onEditLink` to the init signature.

Replace `initGrid`:

```js
export function initGrid({ data, state, onToggleFavorite, onEditLink, onAddLinkToCategory }) {
  dataRef = data;
  stateRef = state;
  onFavoriteToggle = onToggleFavorite;
  onEditCb = onEditLink;
  onAddToCatCb = onAddLinkToCategory;
  render();
}
```

Add module-level vars near the top:

```js
let onEditCb = null;
let onAddToCatCb = null;
```

Replace `renderLinkCard`:

```js
function renderLinkCard(item) {
  const card = document.createElement("a");
  card.href = item.url;
  card.className = "link-card";
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.dataset.linkId = item.id;

  const faviconWrap = document.createElement("div");
  faviconWrap.className = "link-favicon";
  const icon = document.createElement("img");
  icon.src = getFavicon(item.url);
  icon.loading = "lazy";
  icon.alt = "";
  icon.onerror = () => {
    faviconWrap.innerHTML = "";
    const letter = document.createElement("span");
    letter.textContent = (item.name[0] || "?").toUpperCase();
    letter.style.color = "var(--text-main)";
    letter.style.fontWeight = "600";
    letter.style.fontSize = "12px";
    faviconWrap.appendChild(letter);
  };
  faviconWrap.appendChild(icon);

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = item.name;
  title.title = item.name;

  const editBtn = document.createElement("button");
  editBtn.className = "edit-btn";
  editBtn.title = "Edit";
  editBtn.innerHTML = ICONS.pencil;
  editBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditCb) onEditCb(item.id);
  };

  const favBtn = document.createElement("button");
  favBtn.className = `fav-btn ${stateRef.favorites.has(item.id) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle && onFavoriteToggle(item.id);
  };

  card.append(faviconWrap, title, editBtn, favBtn);
  return card;
}
```

Replace the inside of the main render loop (where category sections are built) to add an "add link to this category" button to each section header, and an empty-state slot:

```js
filtered.forEach((cat) => {
  const section = document.createElement("section");
  section.className = "category-section";
  section.dataset.categoryId = cat.id;

  const header = document.createElement("h2");
  header.className = `category-header ${cat.color}`;
  header.innerHTML = `<span class="cat-dot"></span><span class="cat-name">${cat.category}</span>`;
  const addToCatBtn = document.createElement("button");
  addToCatBtn.className = "cat-add-btn";
  addToCatBtn.innerHTML = ICONS.plus;
  addToCatBtn.title = "Add link to this category";
  addToCatBtn.onclick = () => onAddToCatCb && onAddToCatCb(cat.id);
  header.appendChild(addToCatBtn);

  const grid = document.createElement("div");
  grid.className = "grid-view";

  if (cat.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-cat";
    empty.innerHTML = `No links yet. <button class="btn btn-ghost" type="button">+ Add your first link</button>`;
    empty.querySelector("button").onclick = () => onAddToCatCb && onAddToCatCb(cat.id);
    section.append(header, empty);
  } else {
    cat.items.forEach((item) => grid.appendChild(renderLinkCard(item)));
    section.append(header, grid);
  }

  root.appendChild(section);
});
```

Append styles for empty-cat + add-btn:

```css
.category-header {
  position: relative;
}
.cat-add-btn {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: var(--transition);
}
.category-section:hover .cat-add-btn { opacity: 1; }
.cat-add-btn:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
.empty-cat {
  background: var(--surface-1);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
```

- [ ] **Step 4: Wire link editor in `js/main.js`**

Add imports:

```js
import { initLinkEditor, openLinkEditor } from "./crud/link-editor.js";
import { ICONS } from "./icons.js";
```

Initialize link editor after `initGrid`:

```js
initLinkEditor({
  overlay,
  getCategories: () => categories,
  onChange: refreshData,
});
```

Update `initGrid` call:

```js
initGrid({
  data: categories,
  state,
  onToggleFavorite: toggleFavorite,
  onEditLink: (linkId) => openLinkEditor({ linkId }),
  onAddLinkToCategory: (catId) => openLinkEditor({ defaultCategoryId: catId }),
});
```

Create FAB in DOM. Append in `js/main.js` near the bottom:

```js
const fab = document.createElement("button");
fab.className = "fab";
fab.innerHTML = "+";
fab.title = "Add link";
fab.onclick = () => openLinkEditor({});
document.body.appendChild(fab);
```

- [ ] **Step 5: Verify**

Reload. Expected:
- Floating + bottom-right; click → new-link modal opens. Add a link to "Main" with name `test` + url `https://example.com` → appears in Main; reload → still there.
- Hover an existing card → pencil + star both visible; click pencil → edit modal pre-populated; change name → saved.
- Edit a seed link's name (e.g., `gmail` → `Gmail`) → persists; delete it → gone; reload → still gone (overlay deleted list); Reset to defaults via settings → gmail back.
- Edit modal → change category → link moves on save.
- Try saving with empty name → name field shows error. Empty URL → URL error. Invalid URL `foo` → URL error.
- Ctrl+Enter submits.

- [ ] **Step 6: Commit**

```bash
git add js/crud/link-editor.js js/render/grid.js js/main.js js/icons.js styles/main.css
git commit -m "feat(crud): add link editor (add/edit/delete) + FAB + per-category + button"
```

---

## Phase 7 — Category editor + sidebar controls

### Task 7.1: Create category editor

**Files:**
- Create: `js/crud/category-editor.js`

- [ ] **Step 1: Write `js/crud/category-editor.js`**

```js
// js/crud/category-editor.js
// Add / edit / delete a category.

import { openModal, closeModal, confirmDialog, toast } from "./modal.js";
import { save as saveOverlay } from "../storage.js";
import { ICONS } from "../icons.js";

const COLORS = ["yellow", "cyan", "blue", "red", "green", "purple", "light-gray", "gray", "black"];
const ICON_KEYS = [
  "home", "code", "graduation-cap", "cpu", "terminal", "briefcase",
  "gamepad-2", "newspaper", "shopping-cart", "joystick", "star",
  "server", "flag", "shield", "activity", "book",
];

let overlayRef = null;
let categoriesRef = [];
let onChangeCb = null;

export function initCategoryEditor({ overlay, getCategories, onChange }) {
  overlayRef = overlay;
  categoriesRef = getCategories();
  onChangeCb = () => {
    categoriesRef = getCategories();
    if (onChange) onChange();
  };
}

function persist() {
  saveOverlay(overlayRef);
  onChangeCb();
}

function makeCatId(name) {
  const slug = (name || "category")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `cat-user-${slug}-${Date.now().toString(36)}`;
}

export function openCategoryEditor({ categoryId = null } = {}) {
  const isEdit = !!categoryId;
  let existing = null;
  if (isEdit) {
    existing = categoriesRef.find((c) => c.id === categoryId);
    if (!existing) {
      toast("Category not found.", "error");
      return;
    }
  }

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="field">
      <label>Name</label>
      <input id="cat-name" type="text" maxlength="40" required>
      <div class="error" id="cat-name-err" style="display:none">Name is required.</div>
    </div>
    <div class="field">
      <label>Color</label>
      <div id="cat-colors" class="swatch-grid"></div>
    </div>
    <div class="field">
      <label>Icon</label>
      <div id="cat-icons" class="icon-grid"></div>
    </div>
  `;

  const nameI = body.querySelector("#cat-name");
  const colorRoot = body.querySelector("#cat-colors");
  const iconRoot = body.querySelector("#cat-icons");
  const nameErr = body.querySelector("#cat-name-err");

  let selectedColor = existing?.color || "blue";
  let selectedIcon = existing?.icon || "home";

  COLORS.forEach((c) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = `swatch ${c} ${c === selectedColor ? "selected" : ""}`;
    sw.dataset.color = c;
    sw.title = c;
    sw.onclick = () => {
      selectedColor = c;
      colorRoot.querySelectorAll(".swatch").forEach((el) => el.classList.toggle("selected", el.dataset.color === c));
    };
    colorRoot.appendChild(sw);
  });

  ICON_KEYS.forEach((k) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `icon-cell ${k === selectedIcon ? "selected" : ""}`;
    btn.dataset.icon = k;
    btn.innerHTML = ICONS[k];
    btn.title = k;
    btn.onclick = () => {
      selectedIcon = k;
      iconRoot.querySelectorAll(".icon-cell").forEach((el) => el.classList.toggle("selected", el.dataset.icon === k));
    };
    iconRoot.appendChild(btn);
  });

  if (isEdit) nameI.value = existing.category;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "space-between";
  footer.style.gap = "0.5rem";

  const leftGroup = document.createElement("div");
  if (isEdit) {
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Delete category";
    delBtn.onclick = async () => {
      const ok = await confirmDialog({
        title: "Delete category",
        message: `Delete “${existing.category}” and all its links?`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
      deleteCategory(existing.id);
      closeModal();
      toast("Category deleted.", "success");
    };
    leftGroup.appendChild(delBtn);
  }

  const rightGroup = document.createElement("div");
  rightGroup.style.display = "flex";
  rightGroup.style.gap = "0.5rem";
  const cancel = document.createElement("button");
  cancel.className = "btn";
  cancel.textContent = "Cancel";
  cancel.onclick = closeModal;
  const save = document.createElement("button");
  save.className = "btn btn-primary";
  save.textContent = isEdit ? "Save" : "Add category";
  save.onclick = () => {
    const name = nameI.value.trim();
    nameErr.style.display = "none";
    nameI.classList.remove("invalid");
    if (!name) {
      nameErr.style.display = "block";
      nameI.classList.add("invalid");
      return;
    }
    if (isEdit) {
      editCategory(existing.id, { category: name, color: selectedColor, icon: selectedIcon });
    } else {
      addCategory({
        id: makeCatId(name),
        category: name,
        color: selectedColor,
        icon: selectedIcon,
        items: [],
      });
    }
    closeModal();
    toast(isEdit ? "Saved." : "Category added.", "success");
  };
  rightGroup.append(cancel, save);

  footer.append(leftGroup, rightGroup);
  openModal({ title: isEdit ? "Edit category" : "New category", body, footer, width: "480px" });
}

function addCategory(cat) {
  overlayRef.added.categories.push(cat);
  persist();
}

function editCategory(catId, patch) {
  // If added: mutate directly
  const idx = overlayRef.added.categories.findIndex((c) => c.id === catId);
  if (idx !== -1) {
    Object.assign(overlayRef.added.categories[idx], patch);
    persist();
    return;
  }
  overlayRef.edited.categories[catId] = { ...(overlayRef.edited.categories[catId] || {}), ...patch };
  persist();
}

function deleteCategory(catId) {
  const idx = overlayRef.added.categories.findIndex((c) => c.id === catId);
  if (idx !== -1) {
    // also drop any added.links for this category
    delete overlayRef.added.links[catId];
    overlayRef.added.categories.splice(idx, 1);
  } else {
    if (!overlayRef.deleted.categories.includes(catId)) {
      overlayRef.deleted.categories.push(catId);
    }
    delete overlayRef.edited.categories[catId];
  }
  // also remove from order
  overlayRef.order.categories = (overlayRef.order.categories || []).filter((id) => id !== catId);
  delete overlayRef.order.links?.[catId];
  persist();
}
```

- [ ] **Step 2: Append category-editor styles to `styles/main.css`**

```css
/* --- Swatch grid + icon grid --- */
.swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  background: currentColor;
  transition: var(--transition);
  padding: 0;
}

.swatch.yellow { color: #facc15; }
.swatch.cyan { color: #22d3ee; }
.swatch.blue { color: #60a5fa; }
.swatch.red { color: #fb7185; }
.swatch.green { color: #4ade80; }
.swatch.purple { color: #c084fc; }
.swatch.light-gray { color: #cbd5e1; }
.swatch.gray { color: #94a3b8; }
.swatch.black { color: #1e293b; border: 2px solid var(--border-subtle); }
.swatch.selected { border-color: var(--text-main); box-shadow: 0 0 0 3px var(--accent-glow); }

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.375rem;
}

.icon-cell {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: var(--transition);
}

.icon-cell svg { width: 18px; height: 18px; }

.icon-cell:hover { background: var(--surface-2); color: var(--text-main); }
.icon-cell.selected { border-color: var(--accent-primary); color: var(--accent-primary); background: var(--surface-2); }
```

- [ ] **Step 3: Add hover controls to sidebar + section headers**

In `js/render/sidebar.js`, replace the existing `render` function:

```js
function render() {
  const root = document.getElementById("sidebar-categories");
  if (!root) return;
  root.innerHTML = "";
  dataRef.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${activeCategoryRef === cat.category ? "active" : ""}`;
    btn.onclick = () => onSelect && onSelect(cat.category);

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    const count = document.createElement("span");
    count.className = "nav-count";
    count.textContent = cat.items.length;

    const editBtn = document.createElement("span");
    editBtn.className = "nav-edit";
    editBtn.title = "Edit category";
    editBtn.innerHTML = ICONS.pencil;
    editBtn.onclick = (e) => {
      e.stopPropagation();
      if (onEditCb) onEditCb(cat.id);
    };

    btn.append(iconSpan, labelSpan, count, editBtn);
    root.appendChild(btn);
  });

  // "+ New category" button
  if (!document.getElementById("new-cat-btn")) {
    const addBtn = document.createElement("button");
    addBtn.id = "new-cat-btn";
    addBtn.className = "nav-item nav-add";
    addBtn.innerHTML = `<span class="icon">${ICONS.plus}</span><span class="label">New category</span>`;
    addBtn.onclick = () => onAddCb && onAddCb();
    root.appendChild(addBtn);
  } else {
    root.appendChild(document.getElementById("new-cat-btn"));
  }
}
```

Add module vars + extend `initSidebar`:

```js
let onEditCb = null;
let onAddCb = null;

export function initSidebar({ data, activeCategory, onCategorySelect, onEditCategory, onAddCategory }) {
  dataRef = data;
  activeCategoryRef = activeCategory;
  onSelect = onCategorySelect;
  onEditCb = onEditCategory;
  onAddCb = onAddCategory;
  render();
}
```

- [ ] **Step 4: Add nav-count, nav-edit, nav-add styles**

```css
.nav-item .nav-count {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  padding: 0 0.375rem;
}

.nav-item .nav-edit {
  display: none;
  align-items: center;
  margin-left: 0.25rem;
  color: var(--text-dim);
  padding: 2px;
  border-radius: 4px;
}

.nav-item:hover .nav-edit { display: inline-flex; }
.nav-item .nav-edit:hover { color: var(--accent-primary); background: var(--surface-2); }

.nav-item.nav-add {
  color: var(--text-dim);
  border: 1px dashed var(--border-subtle);
  margin-top: 0.5rem;
}
.nav-item.nav-add:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
```

- [ ] **Step 5: Wire category editor into `js/main.js`**

Add import:

```js
import { initCategoryEditor, openCategoryEditor } from "./crud/category-editor.js";
```

Initialize after link editor:

```js
initCategoryEditor({
  overlay,
  getCategories: () => categories,
  onChange: refreshData,
});
```

Update `initSidebar` call:

```js
initSidebar({
  data: categories,
  activeCategory: state.activeCategory,
  onCategorySelect: selectCategory,
  onEditCategory: (catId) => openCategoryEditor({ categoryId: catId }),
  onAddCategory: () => openCategoryEditor({}),
});
```

- [ ] **Step 6: Verify**

Reload. Hover any sidebar category → count + pencil show. Click pencil → modal with name, color swatches, icon grid. Change color → sidebar dot + grid header change. Click + New category at bottom of sidebar → modal opens with name field; add `Test Cat`, pick a color and icon → appears in sidebar (empty) + reset shows "No links yet"; add a link to it; delete the category from edit modal → category + its links gone; reset to defaults → seed categories restored.

- [ ] **Step 7: Commit**

```bash
git add js/crud/category-editor.js js/render/sidebar.js js/main.js styles/main.css
git commit -m "feat(crud): add category editor + sidebar controls + counts"
```

---

## Phase 8 — Drag-to-reorder (desktop + touch)

### Task 8.1: Create DnD module

**Files:**
- Create: `js/crud/dnd.js`

- [ ] **Step 1: Write `js/crud/dnd.js`**

```js
// js/crud/dnd.js
// Drag-reorder for link cards (within + across categories) and sidebar categories.
// Desktop: native HTML5 DnD. Touch: long-press 350ms triggers, then track touchmove.

import { save as saveOverlay } from "../storage.js";

let overlayRef = null;
let onChangeCb = null;

export function initDnD({ overlay, onChange }) {
  overlayRef = overlay;
  onChangeCb = onChange;
  attach();
  // re-attach on each refresh (call attach() after rerender)
}

export function attach() {
  // Link cards
  document.querySelectorAll(".link-card").forEach((card) => {
    if (card._dndBound) return;
    card._dndBound = true;
    card.draggable = true;
    card.addEventListener("dragstart", onLinkDragStart);
    card.addEventListener("dragover", onLinkDragOver);
    card.addEventListener("drop", onLinkDrop);
    card.addEventListener("dragend", onLinkDragEnd);

    bindTouchDrag(card, "link");
  });

  // Categories in sidebar
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
    if (item._dndBound) return;
    if (item.dataset.cat === "all" || item.id === "new-cat-btn") return;
    item._dndBound = true;
    item.draggable = true;
    item.addEventListener("dragstart", onCatDragStart);
    item.addEventListener("dragover", onCatDragOver);
    item.addEventListener("drop", onCatDrop);
    item.addEventListener("dragend", onCatDragEnd);

    bindTouchDrag(item, "cat");
  });

  // Allow dropping a link onto a sidebar category to move it
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
    item.addEventListener("dragover", (e) => {
      if (window._dragKind === "link") {
        e.preventDefault();
        item.classList.add("drop-target");
      }
    });
    item.addEventListener("dragleave", () => item.classList.remove("drop-target"));
    item.addEventListener("drop", (e) => {
      if (window._dragKind !== "link") return;
      e.preventDefault();
      item.classList.remove("drop-target");
      const linkId = window._draggedLinkId;
      const targetCatLabel = item.querySelector(".label")?.textContent;
      moveLinkToCategoryByLabel(linkId, targetCatLabel);
    });
  });
}

function onLinkDragStart(e) {
  window._draggedLinkId = e.currentTarget.dataset.linkId;
  window._dragKind = "link";
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
}

function onLinkDragOver(e) {
  if (window._dragKind !== "link") return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drop-target");
}

function onLinkDrop(e) {
  if (window._dragKind !== "link") return;
  e.preventDefault();
  e.currentTarget.classList.remove("drop-target");
  const draggedId = window._draggedLinkId;
  const targetCard = e.currentTarget;
  const targetId = targetCard.dataset.linkId;
  if (draggedId === targetId) return;
  const targetSection = targetCard.closest(".category-section");
  const targetCatId = targetSection?.dataset.categoryId;
  reorderLink(draggedId, targetId, targetCatId);
}

function onLinkDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
  window._draggedLinkId = null;
  window._dragKind = null;
}

function onCatDragStart(e) {
  window._draggedCatLabel = e.currentTarget.querySelector(".label")?.textContent;
  window._dragKind = "cat";
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
}

function onCatDragOver(e) {
  if (window._dragKind !== "cat") return;
  e.preventDefault();
}

function onCatDrop(e) {
  if (window._dragKind !== "cat") return;
  e.preventDefault();
  const draggedLabel = window._draggedCatLabel;
  const targetLabel = e.currentTarget.querySelector(".label")?.textContent;
  if (draggedLabel === targetLabel) return;
  reorderCategoryByLabel(draggedLabel, targetLabel);
}

function onCatDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  window._draggedCatLabel = null;
  window._dragKind = null;
}

// --- Touch drag ---

function bindTouchDrag(el, kind) {
  let pressTimer = null;
  let dragging = false;
  let ghost = null;
  let touchStartX = 0, touchStartY = 0;
  let currentTarget = null;

  el.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    pressTimer = setTimeout(() => {
      dragging = true;
      window._dragKind = kind;
      if (kind === "link") window._draggedLinkId = el.dataset.linkId;
      if (kind === "cat") window._draggedCatLabel = el.querySelector(".label")?.textContent;
      ghost = el.cloneNode(true);
      ghost.style.position = "fixed";
      ghost.style.pointerEvents = "none";
      ghost.style.opacity = "0.8";
      ghost.style.left = t.clientX + "px";
      ghost.style.top = t.clientY + "px";
      ghost.style.zIndex = "300";
      document.body.appendChild(ghost);
      el.classList.add("dragging");
    }, 350);
  }, { passive: true });

  el.addEventListener("touchmove", (e) => {
    if (!dragging) {
      const t = e.touches[0];
      if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) {
        clearTimeout(pressTimer);
      }
      return;
    }
    e.preventDefault();
    const t = e.touches[0];
    ghost.style.left = t.clientX + "px";
    ghost.style.top = t.clientY + "px";

    // find drop target under finger
    ghost.style.display = "none";
    const under = document.elementFromPoint(t.clientX, t.clientY);
    ghost.style.display = "";
    document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    if (under) {
      const targetCard = under.closest(kind === "link" ? ".link-card" : ".nav-item");
      if (targetCard && targetCard !== el) {
        targetCard.classList.add("drop-target");
        currentTarget = targetCard;
      } else if (kind === "link") {
        const targetNav = under.closest(".nav-item");
        if (targetNav && targetNav.dataset.cat !== "all" && targetNav.id !== "new-cat-btn") {
          targetNav.classList.add("drop-target");
          currentTarget = targetNav;
        }
      }
    }
  }, { passive: false });

  el.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
    if (!dragging) return;
    dragging = false;
    if (ghost) ghost.remove();
    ghost = null;
    el.classList.remove("dragging");

    if (currentTarget) {
      currentTarget.classList.remove("drop-target");
      if (kind === "link") {
        if (currentTarget.classList.contains("link-card")) {
          const targetSection = currentTarget.closest(".category-section");
          reorderLink(window._draggedLinkId, currentTarget.dataset.linkId, targetSection?.dataset.categoryId);
        } else {
          const label = currentTarget.querySelector(".label")?.textContent;
          moveLinkToCategoryByLabel(window._draggedLinkId, label);
        }
      } else if (kind === "cat") {
        const label = currentTarget.querySelector(".label")?.textContent;
        reorderCategoryByLabel(window._draggedCatLabel, label);
      }
    }
    currentTarget = null;
    window._draggedLinkId = null;
    window._draggedCatLabel = null;
    window._dragKind = null;
  });
}

// --- State mutations ---

function reorderLink(draggedId, beforeId, targetCatId) {
  // We need to recompute the per-category order so we can persist it.
  // First, find the source category of draggedId.
  const allSections = Array.from(document.querySelectorAll(".category-section"));
  const cardOrders = new Map(); // catId → array of linkIds (current visual order)
  allSections.forEach((sec) => {
    const ids = Array.from(sec.querySelectorAll(".link-card")).map((c) => c.dataset.linkId);
    cardOrders.set(sec.dataset.categoryId, ids);
  });

  let sourceCatId = null;
  cardOrders.forEach((ids, catId) => {
    if (ids.includes(draggedId)) sourceCatId = catId;
  });
  if (!sourceCatId) return;

  // remove dragged from source
  cardOrders.set(sourceCatId, cardOrders.get(sourceCatId).filter((id) => id !== draggedId));

  // insert before beforeId in target
  const targetList = cardOrders.get(targetCatId) || [];
  const idx = targetList.indexOf(beforeId);
  if (idx === -1) targetList.push(draggedId);
  else targetList.splice(idx, 0, draggedId);
  cardOrders.set(targetCatId, targetList);

  // If cross-category move, record categoryId change in overlay.edited.links
  if (sourceCatId !== targetCatId) {
    // Is dragged an added link?
    let added = false;
    for (const cId in overlayRef.added.links) {
      const arr = overlayRef.added.links[cId];
      const i = arr.findIndex((l) => l.id === draggedId);
      if (i !== -1) {
        const [moved] = arr.splice(i, 1);
        if (!overlayRef.added.links[targetCatId]) overlayRef.added.links[targetCatId] = [];
        overlayRef.added.links[targetCatId].push(moved);
        added = true;
        break;
      }
    }
    if (!added) {
      overlayRef.edited.links[draggedId] = {
        ...(overlayRef.edited.links[draggedId] || {}),
        categoryId: targetCatId,
      };
    }
  }

  // Persist new per-category orders for the categories that changed
  if (!overlayRef.order.links) overlayRef.order.links = {};
  overlayRef.order.links[targetCatId] = cardOrders.get(targetCatId);
  if (sourceCatId !== targetCatId) {
    overlayRef.order.links[sourceCatId] = cardOrders.get(sourceCatId);
  }

  saveOverlay(overlayRef);
  if (onChangeCb) onChangeCb();
}

function moveLinkToCategoryByLabel(draggedId, targetCatLabel) {
  if (!draggedId || !targetCatLabel) return;
  // Find target catId by walking current rendered categories (via section dataset).
  let targetCatId = null;
  document.querySelectorAll(".category-section").forEach((sec) => {
    const headerName = sec.querySelector(".cat-name")?.textContent.trim();
    if (headerName === targetCatLabel) targetCatId = sec.dataset.categoryId;
  });
  if (!targetCatId) return;
  // Append at end of target
  reorderLink(draggedId, /* beforeId */ "__end__", targetCatId);
}

function reorderCategoryByLabel(draggedLabel, targetLabel) {
  const labels = Array.from(document.querySelectorAll(".sidebar-nav .nav-item .label")).map((l) => l.textContent.trim());
  // Need to map labels back to ids — we read from rendered sections (each .category-section has dataset.categoryId + .cat-name).
  const labelToId = new Map();
  document.querySelectorAll(".category-section").forEach((sec) => {
    const name = sec.querySelector(".cat-name")?.textContent.trim();
    if (name) labelToId.set(name, sec.dataset.categoryId);
  });
  // also include categories not currently shown (filtered view) — fallback to all data via attribute
  // But simplest: only meaningful when "Overview" is selected, since otherwise only one section is rendered.

  // Build the current category id order from the sidebar (excluding "Overview" and "+ New").
  const orderedIds = labels
    .filter((l) => l !== "Overview" && l !== "New category")
    .map((l) => labelToId.get(l))
    .filter(Boolean);

  const draggedId = labelToId.get(draggedLabel);
  const targetId = labelToId.get(targetLabel);
  if (!draggedId || !targetId) return;

  const without = orderedIds.filter((id) => id !== draggedId);
  const idx = without.indexOf(targetId);
  without.splice(idx, 0, draggedId);

  overlayRef.order.categories = without;
  saveOverlay(overlayRef);
  if (onChangeCb) onChangeCb();
}
```

- [ ] **Step 2: Append DnD styles to `styles/main.css`**

```css
.link-card.dragging,
.nav-item.dragging {
  opacity: 0.4;
}

.link-card.drop-target,
.nav-item.drop-target {
  outline: 2px dashed var(--accent-primary);
  outline-offset: -2px;
}
```

- [ ] **Step 3: Wire DnD in `js/main.js`**

Add import:

```js
import { initDnD, attach as attachDnD } from "./crud/dnd.js";
```

Call after first initial render (near where other init runs):

```js
initDnD({
  overlay,
  onChange: refreshData,
});
attachDnD();
```

Update `refreshData` to re-attach after rerender:

```js
export function refreshData() {
  categories = merge(seed, overlay);
  setGridData(categories);
  setSidebarData(categories, state.activeCategory);
  attachDnD();
}
```

The `reorderLink` function handles the `__end__` sentinel by appending — already coded.

- [ ] **Step 4: Verify**

Reload. Expected:
- Drag `github` card → drop on `gmail` card → github moves before gmail in Main; persists.
- Drag any link → drop on a sidebar category → link moves to that category; persists.
- Drag a sidebar category → drop on another → sidebar order changes; persists across reload.
- On a touch device or with DevTools device mode: long-press a card 350ms → ghost appears, drag, drop on target.
- Tapping a card (without long-press) still opens the link.

- [ ] **Step 5: Commit**

```bash
git add js/crud/dnd.js js/main.js styles/main.css
git commit -m "feat(dnd): drag-reorder links + categories with touch fallback"
```

---

## Phase 9 — Smart unified search

Replace the inline filter input handling with a proper search module: live-filter shortcuts, prepend a "Search the web" row, support engine prefixes, keyboard navigation, and an engine-switcher chip.

### Task 9.1: Add engine chip to header

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace search container in `index.html`**

Replace the existing `<div class="search-container">…</div>` block with:

```html
<div class="search-container">
  <button id="engine-chip" class="engine-chip" type="button" title="Switch search engine">
    <span class="engine-label">DDG</span>
    <span class="engine-caret">▾</span>
  </button>
  <input
    id="filter"
    type="text"
    placeholder="Search shortcuts or the web…"
    autocomplete="off"
    spellcheck="false"
  />
  <div id="engine-menu" class="engine-menu" hidden></div>
</div>
```

- [ ] **Step 2: Append search-related styles to `styles/main.css`**

```css
.search-container {
  width: 100%;
  max-width: 520px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
}

/* Override earlier .search-container input padding (left now reserved for chip) */
.search-container input {
  width: 100%;
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 99px;
  padding: 12px 20px 12px 92px;
  color: var(--text-main);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  transition: var(--transition);
  backdrop-filter: blur(10px);
}

.search-container input:focus {
  background: var(--surface-2);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px var(--accent-glow);
  max-width: 480px;
}

.search-icon { display: none; }

.engine-chip {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: var(--transition);
  z-index: 2;
}

.engine-chip:hover { color: var(--text-main); background: var(--surface-3); }
.engine-chip.override { color: var(--accent-primary); border-color: var(--accent-primary); }

.engine-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: var(--bg-app);
  border: 1px solid var(--border-highlight);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  min-width: 220px;
  z-index: 60;
  box-shadow: var(--shadow-lg);
}

.engine-menu button {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0.5rem 0.625rem;
  color: var(--text-main);
  font-size: 0.8125rem;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}

.engine-menu button:hover { background: var(--surface-2); }
.engine-menu .divider { height: 1px; background: var(--border-subtle); margin: 0.25rem 0; }

/* --- Search results --- */
.search-results {
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  max-width: 720px;
  margin: 0 auto;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.search-result.selected,
.search-result:hover {
  background: var(--surface-2);
  color: var(--text-main);
  box-shadow: inset 3px 0 0 var(--accent-primary);
}

.search-result .link-favicon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.search-result .link-favicon img { width: 14px; height: 14px; }

.search-result .meta {
  font-size: 0.6875rem;
  color: var(--text-dim);
  margin-left: auto;
}

.search-web-row {
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 0.375rem;
  padding-bottom: 0.5rem;
}

.search-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
```

### Task 9.2: Create search module

**Files:**
- Create: `js/search.js`
- Modify: `js/render/grid.js` (remove its in-built search), `js/main.js`

- [ ] **Step 1: Write `js/search.js`**

```js
// js/search.js
// Unified smart search: live shortcut filter + web search fallback + engine prefixes.

import { getFavicon } from "./favicons.js";
import { BUILTIN_ENGINES, getAllEngines, resolveEngine, searchUrl, detectPrefix } from "./engines.js";
import { save as saveOverlay } from "./storage.js";

let overlayRef = null;
let getCategoriesFn = null;
let getDefaultEngineFn = null;

let input, chip, chipLabel, menu, container;
let selectionIdx = 0;
let currentResults = []; // {kind: "shortcut"|"web", linkId?, name, url, category?}

export function initSearch({ overlay, getCategories }) {
  overlayRef = overlay;
  getCategoriesFn = getCategories;
  getDefaultEngineFn = () => overlayRef.settings.defaultEngine || "ddg";

  input = document.getElementById("filter");
  chip = document.getElementById("engine-chip");
  chipLabel = chip.querySelector(".engine-label");
  menu = document.getElementById("engine-menu");
  container = document.getElementById("view-container");

  updateChipLabel();

  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKey);
  chip.addEventListener("click", toggleEngineMenu);
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== chip) closeEngineMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== input && !isTypingTarget(document.activeElement)) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

function updateChipLabel() {
  const q = (input?.value || "").trim();
  const detected = detectPrefix(q, overlayRef);
  if (detected) {
    chipLabel.textContent = detected.prefix.label;
    chip.classList.add("override");
  } else {
    const eng = resolveEngine(getDefaultEngineFn(), overlayRef);
    chipLabel.textContent = eng.label;
    chip.classList.remove("override");
  }
}

function toggleEngineMenu(e) {
  e.stopPropagation();
  if (!menu.hidden) {
    closeEngineMenu();
    return;
  }
  renderEngineMenu();
  menu.hidden = false;
}

function closeEngineMenu() {
  menu.hidden = true;
}

function renderEngineMenu() {
  menu.innerHTML = "";
  const def = getDefaultEngineFn();
  getAllEngines(overlayRef).forEach((e) => {
    const b = document.createElement("button");
    b.textContent = `${e.label}${e.key === def ? "  ✓" : ""}`;
    b.onclick = () => {
      overlayRef.settings.defaultEngine = e.key;
      saveOverlay(overlayRef);
      updateChipLabel();
      closeEngineMenu();
    };
    menu.appendChild(b);
  });
}

function onInput() {
  selectionIdx = 0;
  render();
  updateChipLabel();
}

function onKey(e) {
  if (e.key === "Escape") {
    input.value = "";
    input.blur();
    render();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectionIdx = Math.min(selectionIdx + 1, currentResults.length - 1);
    paintSelection();
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    selectionIdx = Math.max(selectionIdx - 1, 0);
    paintSelection();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    handleEnter(e);
  }
}

function handleEnter(e) {
  const q = input.value.trim();
  if (!q) return;
  const selected = currentResults[selectionIdx];
  if (e.shiftKey) {
    // force web search
    runWebSearch(q);
    return;
  }
  if (selected) {
    if (selected.kind === "shortcut") {
      const where = e.ctrlKey || e.metaKey ? "_self" : "_blank";
      window.open(selected.url, where);
    } else if (selected.kind === "web") {
      window.open(selected.url, "_blank");
    }
  }
}

function runWebSearch(query) {
  const detected = detectPrefix(query, overlayRef);
  if (detected) {
    window.open(searchUrl(detected.prefix.urlTemplate, detected.query), "_blank");
    return;
  }
  const eng = resolveEngine(getDefaultEngineFn(), overlayRef);
  window.open(searchUrl(eng.urlTemplate, query), "_blank");
}

function score(name, url, q) {
  const n = name.toLowerCase(), u = url.toLowerCase();
  if (n.startsWith(q)) return 3;
  if (n.includes(q)) return 2;
  if (u.includes(q)) return 1;
  return 0;
}

export function render() {
  const q = input.value.trim();
  const root = container;
  if (!q) {
    // Empty query — let the grid render its normal view; just clear search overlay if present.
    document.dispatchEvent(new CustomEvent("search:cleared"));
    return;
  }
  document.dispatchEvent(new CustomEvent("search:active"));

  const lower = q.toLowerCase();
  const detected = detectPrefix(q, overlayRef);
  const matches = [];

  if (!detected) {
    // Only filter shortcuts when there is no prefix override
    (getCategoriesFn() || []).forEach((cat) => {
      cat.items.forEach((it) => {
        const s = score(it.name, it.url, lower);
        if (s > 0) matches.push({ kind: "shortcut", linkId: it.id, name: it.name, url: it.url, category: cat.category, _score: s });
      });
    });
    matches.sort((a, b) => b._score - a._score || a.name.localeCompare(b.name));
  }

  // Build current results: web row first (always), then matches
  const webLabel = detected
    ? `Search ${detected.prefix.label} for "${detected.query}"`
    : `Search ${resolveEngine(getDefaultEngineFn(), overlayRef).label} for "${q}"`;
  const webUrl = detected
    ? searchUrl(detected.prefix.urlTemplate, detected.query)
    : searchUrl(resolveEngine(getDefaultEngineFn(), overlayRef).urlTemplate, q);

  currentResults = [
    { kind: "web", name: webLabel, url: webUrl, web: true },
    ...matches,
  ];

  root.innerHTML = "";
  const box = document.createElement("div");
  box.className = "search-results";

  // web row
  const webRow = document.createElement("a");
  webRow.className = "search-result search-web-row";
  webRow.href = webUrl;
  webRow.target = "_blank";
  webRow.rel = "noopener noreferrer";
  webRow.innerHTML = `
    <div class="link-favicon"><span style="font-size:14px">↵</span></div>
    <span>${webLabel}</span>
  `;
  webRow.dataset.idx = "0";
  box.appendChild(webRow);

  if (matches.length === 0 && !detected) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = "No shortcuts match. Press Enter to search the web.";
    box.appendChild(empty);
  }

  matches.forEach((m, i) => {
    const row = document.createElement("a");
    row.className = "search-result";
    row.href = m.url;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
    row.dataset.idx = String(i + 1);
    row.innerHTML = `
      <div class="link-favicon"><img src="${getFavicon(m.url)}" alt=""></div>
      <span>${m.name}</span>
      <span class="meta">${m.category}</span>
    `;
    box.appendChild(row);
  });

  root.appendChild(box);
  paintSelection();
}

function paintSelection() {
  container.querySelectorAll(".search-result").forEach((row) => {
    row.classList.toggle("selected", Number(row.dataset.idx) === selectionIdx);
  });
  const sel = container.querySelector(".search-result.selected");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}
```

- [ ] **Step 2: Remove inline search code from `js/render/grid.js`**

In `js/render/grid.js`, change `render()` so it no longer handles search-mode itself. Replace its whole body:

```js
function render() {
  const root = document.getElementById("view-container");
  if (!root) return;
  // Search overlay is owned by search.js. Only render grid when no query.
  if (stateRef.searchQuery && stateRef.searchQuery.trim()) return;
  root.innerHTML = "";

  const filtered =
    stateRef.activeCategory === "all"
      ? dataRef
      : dataRef.filter((c) => c.category === stateRef.activeCategory);

  filtered.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";
    section.dataset.categoryId = cat.id;

    const header = document.createElement("h2");
    header.className = `category-header ${cat.color}`;
    header.innerHTML = `<span class="cat-dot"></span><span class="cat-name">${cat.category}</span>`;
    const addToCatBtn = document.createElement("button");
    addToCatBtn.className = "cat-add-btn";
    addToCatBtn.innerHTML = ICONS.plus;
    addToCatBtn.title = "Add link to this category";
    addToCatBtn.onclick = () => onAddToCatCb && onAddToCatCb(cat.id);
    header.appendChild(addToCatBtn);

    const grid = document.createElement("div");
    grid.className = "grid-view";

    if (cat.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-cat";
      empty.innerHTML = `No links yet. <button class="btn btn-ghost" type="button">+ Add your first link</button>`;
      empty.querySelector("button").onclick = () => onAddToCatCb && onAddToCatCb(cat.id);
      section.append(header, empty);
    } else {
      cat.items.forEach((item) => grid.appendChild(renderLinkCard(item)));
      section.append(header, grid);
    }

    root.appendChild(section);
  });
}
```

Delete the `renderSearchResults` function entirely from `js/render/grid.js`.

- [ ] **Step 3: Wire search.js in `js/main.js`**

In `js/main.js`, remove the old `filterInput.addEventListener('input', …)` and the old `/` keydown listener (they're replaced).

Add import:

```js
import { initSearch, render as renderSearch } from "./search.js";
```

After other inits, add:

```js
initSearch({
  overlay,
  getCategories: () => categories,
});

// When search clears, re-render the grid normally.
document.addEventListener("search:cleared", () => {
  state.searchQuery = "";
  setGridState({ searchQuery: "" });
});

document.addEventListener("search:active", () => {
  state.searchQuery = document.getElementById("filter").value;
  // grid will skip rendering because of searchQuery; search.js owns the view.
});
```

When `refreshData()` runs (e.g. CRUD changes), re-render search results too:

```js
export function refreshData() {
  categories = merge(seed, overlay);
  setGridData(categories);
  setSidebarData(categories, state.activeCategory);
  attachDnD();
  // If a search is active, re-render the search overlay so changes appear immediately.
  if (document.getElementById("filter").value.trim()) renderSearch();
}
```

- [ ] **Step 4: Verify**

Reload. Expected:
- Engine chip left of input shows "DuckDuckGo" (or current default).
- Type `git` → search overlay shows "Search DuckDuckGo for 'git'" at top, then matching shortcuts (github first).
- Press ↓ ↓ → selection moves down with left stripe indicator.
- Press Enter → opens top match in new tab.
- Ctrl+Enter → opens in current tab.
- Shift+Enter → opens web search regardless.
- Type `g react hooks` → chip switches to "Google" + indicator color; only web row shown (because prefix overrides shortcut filtering); Enter opens Google.
- Click engine chip → menu lists engines; clicking changes default.
- Add custom engine via settings (e.g., key `kg`, label `Kagi-test`, URL `https://kagi.com/search?q=%s`) → appears in chip menu.
- Type `kg foo` → uses Kagi-test on Enter.
- Type something with no shortcut match → "No shortcuts match. Press Enter to search the web."
- Press `/` from a clean state → focuses input.
- Press Esc with text in input → clears + blurs + grid returns.

- [ ] **Step 5: Commit**

```bash
git add js/search.js js/render/grid.js js/main.js index.html styles/main.css
git commit -m "feat(search): unified smart search with engine chip, prefixes, keyboard nav"
```

---

## Phase 10 — Weather widget

### Task 10.1: Create weather module + chip

**Files:**
- Create: `js/weather.js`
- Modify: `index.html`, `js/main.js`, `styles/main.css`

- [ ] **Step 1: Add weather chip placeholder to `index.html` header**

In `index.html`, replace the `.header-right` block with:

```html
<div class="header-right">
  <button id="weather-chip" class="weather-chip" type="button" title="Weather settings">
    <span class="weather-icon">⚙</span>
    <span class="weather-temp">Set up weather</span>
  </button>
  <div class="timer-wrap">
    <span id="clock" class="clock">12:00</span>
  </div>

  <div class="search-container">
    <button id="engine-chip" class="engine-chip" type="button" title="Switch search engine">
      <span class="engine-label">DDG</span>
      <span class="engine-caret">▾</span>
    </button>
    <input
      id="filter"
      type="text"
      placeholder="Search shortcuts or the web…"
      autocomplete="off"
      spellcheck="false"
    />
    <div id="engine-menu" class="engine-menu" hidden></div>
  </div>
</div>
```

- [ ] **Step 2: Append weather styles**

```css
.weather-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: 99px;
  padding: 6px 12px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: var(--transition);
}

.weather-chip:hover { background: var(--surface-2); color: var(--text-main); }

.weather-chip.unconfigured {
  border-style: dashed;
  opacity: 0.7;
}

.weather-chip.error { border-color: #fb7185; color: #fda4af; }

.weather-chip .weather-temp { font-variant-numeric: tabular-nums; }
.weather-chip .weather-icon { font-size: 1rem; line-height: 1; }
.weather-chip .weather-loc {
  color: var(--text-dim);
  font-size: 0.75rem;
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Stack header right cluster on narrow viewports */
@media (max-width: 720px) {
  .header-right {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .weather-chip { align-self: flex-end; }
}
```

- [ ] **Step 3: Write `js/weather.js`**

```js
// js/weather.js
// Fetches OpenWeatherMap, renders chip in header, caches 15min.

import { openSettings } from "./crud/settings.js";

const CACHE_KEY = "weather_cache_v1";
const STALE_MS = 15 * 60 * 1000;

const ICON_MAP = {
  Clear: "☀",
  Clouds: "☁",
  Rain: "🌧",
  Drizzle: "🌦",
  Thunderstorm: "⛈",
  Snow: "❄",
  Mist: "🌫",
  Fog: "🌫",
  Haze: "🌫",
  Smoke: "🌫",
};

let chip, iconEl, tempEl;
let overlayRef = null;

export function initWeather({ overlay }) {
  overlayRef = overlay;
  chip = document.getElementById("weather-chip");
  chip.onclick = () => openSettings("weather");
  ensureChildren();
  render();
  window.addEventListener("focus", () => {
    const cache = readCache();
    if (!cache || Date.now() - cache.fetchedAt > STALE_MS) refresh();
  });
}

function ensureChildren() {
  // Chip starts with placeholder children; this normalizes its structure.
  chip.innerHTML = `
    <span class="weather-icon">⚙</span>
    <span class="weather-temp">Set up weather</span>
    <span class="weather-loc" hidden></span>
  `;
  iconEl = chip.querySelector(".weather-icon");
  tempEl = chip.querySelector(".weather-temp");
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(obj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn("[weather] cache write failed:", e);
  }
}

export function refresh() {
  const cfg = overlayRef.settings.weather;
  if (!cfg || !cfg.apiKey || cfg.lat == null || cfg.lon == null) return render();
  fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${cfg.lat}&lon=${cfg.lon}&units=${cfg.units || "metric"}&appid=${cfg.apiKey}`,
  )
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      writeCache({
        data: {
          temp: data.main.temp,
          feels: data.main.feels_like,
          humidity: data.main.humidity,
          label: cfg.label,
          icon: ICON_MAP[data.weather[0]?.main] || "•",
          units: cfg.units || "metric",
        },
        fetchedAt: Date.now(),
        lat: cfg.lat,
        lon: cfg.lon,
      });
      render();
    })
    .catch((e) => {
      console.warn("[weather] fetch failed:", e);
      renderError(e.message);
    });
}

export function render() {
  const cfg = overlayRef.settings.weather;
  if (!cfg || !cfg.apiKey || cfg.lat == null || cfg.lon == null) {
    chip.className = "weather-chip unconfigured";
    iconEl.textContent = "⚙";
    tempEl.textContent = "Set up weather";
    chip.title = "Click to set up weather";
    chip.querySelector(".weather-loc").hidden = true;
    return;
  }
  const cache = readCache();
  if (cache && Date.now() - cache.fetchedAt < STALE_MS) {
    paintFromCache(cache);
  } else {
    paintFromCache(cache || { data: { temp: "—", icon: "…", label: cfg.label, units: cfg.units }, fetchedAt: Date.now() });
    refresh();
  }
}

function paintFromCache(cache) {
  const d = cache.data;
  chip.className = "weather-chip";
  iconEl.textContent = d.icon;
  const unit = d.units === "imperial" ? "°F" : "°C";
  tempEl.textContent = `${typeof d.temp === "number" ? Math.round(d.temp) : d.temp}${unit !== "" ? unit.replace("°", "°") : ""}`;
  // simpler: keep temp like "18°"
  tempEl.textContent = `${typeof d.temp === "number" ? Math.round(d.temp) + "°" : d.temp}`;
  const loc = chip.querySelector(".weather-loc");
  loc.hidden = false;
  loc.textContent = (d.label || "").slice(0, 14);
  const ago = Math.round((Date.now() - cache.fetchedAt) / 60000);
  chip.title = `Feels like ${Math.round(d.feels)}°, humidity ${d.humidity}%, updated ${ago}m ago`;
}

function renderError(msg) {
  chip.className = "weather-chip error";
  iconEl.textContent = "⚠";
  tempEl.textContent = "Weather unavailable";
  chip.querySelector(".weather-loc").hidden = true;
  chip.title = `Error: ${msg}`;
}
```

- [ ] **Step 4: Wire weather in `js/main.js`**

Add import:

```js
import { initWeather, render as renderWeather, refresh as refreshWeather } from "./weather.js";
```

After other inits, add:

```js
initWeather({ overlay });
```

In `js/crud/settings.js`, the existing `persistAndNotify` calls `onChangeCb` which triggers `refreshData`. We also want weather chip to re-render when its config changes — extend that callback. Simplest: have `refreshData` also call `renderWeather`.

Update `js/main.js` `refreshData`:

```js
export function refreshData() {
  categories = merge(seed, overlay);
  setGridData(categories);
  setSidebarData(categories, state.activeCategory);
  attachDnD();
  renderWeather();
  if (document.getElementById("filter").value.trim()) renderSearch();
}
```

- [ ] **Step 5: Verify**

Reload. Without config: chip shows `⚙ Set up weather` with dashed border. Click → settings opens scrolled to Weather section. Enter API key + city (e.g., `Warsaw, PL`) → blur location field → geocode picker shows up to 5 results → pick one → click Test → status shows OK with temp. Close settings — chip now shows current temp + city. Refresh tab → chip persists from cache. Wait 15 min or change a setting → fetch retry. Wrong API key → chip shows `⚠ Weather unavailable`, tooltip explains.

- [ ] **Step 6: Commit**

```bash
git add js/weather.js js/main.js index.html styles/main.css
git commit -m "feat(weather): add OpenWeatherMap chip with 15min cache"
```

---

## Phase 11 — Help guide + README + final polish

### Task 11.0: Pinned favorites in sidebar + section-header edit

Closes two spec gaps: sidebar pinned group + edit pencil on grid category headers.

**Files:**
- Modify: `js/render/sidebar.js`, `js/render/grid.js`, `js/main.js`, `styles/main.css`

- [ ] **Step 1: Render pinned group in sidebar**

In `js/render/sidebar.js`, extend module state:

```js
let favoritesRef = new Set();
let onLinkClickCb = null;
```

Extend `initSidebar` signature:

```js
export function initSidebar({ data, activeCategory, onCategorySelect, onEditCategory, onAddCategory, favorites, onPinnedLinkOpen }) {
  dataRef = data;
  activeCategoryRef = activeCategory;
  onSelect = onCategorySelect;
  onEditCb = onEditCategory;
  onAddCb = onAddCategory;
  favoritesRef = favorites || new Set();
  onLinkClickCb = onPinnedLinkOpen;
  render();
}
```

Add `setFavorites` export:

```js
export function setFavorites(favs) {
  favoritesRef = favs || new Set();
  render();
}
```

In `render()`, before the category loop, insert the pinned group:

```js
function render() {
  const root = document.getElementById("sidebar-categories");
  if (!root) return;
  root.innerHTML = "";

  // --- Pinned group ---
  const pinnedLinks = [];
  dataRef.forEach((cat) => {
    cat.items.forEach((l) => {
      if (favoritesRef.has(l.id)) pinnedLinks.push({ link: l, color: cat.color });
    });
  });

  if (pinnedLinks.length) {
    const heading = document.createElement("div");
    heading.className = "nav-section-label";
    heading.textContent = "Pinned";
    root.appendChild(heading);

    const pinnedWrap = document.createElement("div");
    pinnedWrap.className = "nav-pinned";
    pinnedLinks.forEach((p) => {
      const a = document.createElement("a");
      a.className = "nav-pinned-item";
      a.href = p.link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span class="cat-dot ${p.color}"></span><span class="label">${p.link.name}</span>`;
      pinnedWrap.appendChild(a);
    });
    root.appendChild(pinnedWrap);

    const divider = document.createElement("div");
    divider.className = "nav-divider";
    root.appendChild(divider);
  }

  // --- Categories ---
  dataRef.forEach((cat) => {
    // (existing category-button code from Task 7.1 step 3)
    const btn = document.createElement("button");
    btn.className = `nav-item ${activeCategoryRef === cat.category ? "active" : ""}`;
    btn.onclick = () => onSelect && onSelect(cat.category);

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    const count = document.createElement("span");
    count.className = "nav-count";
    count.textContent = cat.items.length;

    const editBtn = document.createElement("span");
    editBtn.className = "nav-edit";
    editBtn.title = "Edit category";
    editBtn.innerHTML = ICONS.pencil;
    editBtn.onclick = (e) => {
      e.stopPropagation();
      if (onEditCb) onEditCb(cat.id);
    };

    btn.append(iconSpan, labelSpan, count, editBtn);
    root.appendChild(btn);
  });

  // "+ New category" button
  const addBtn = document.createElement("button");
  addBtn.id = "new-cat-btn";
  addBtn.className = "nav-item nav-add";
  addBtn.innerHTML = `<span class="icon">${ICONS.plus}</span><span class="label">New category</span>`;
  addBtn.onclick = () => onAddCb && onAddCb();
  root.appendChild(addBtn);
}
```

- [ ] **Step 2: Update `js/main.js` to pass favorites + re-sync on toggle**

Update `initSidebar` call:

```js
initSidebar({
  data: categories,
  activeCategory: state.activeCategory,
  onCategorySelect: selectCategory,
  onEditCategory: (catId) => openCategoryEditor({ categoryId: catId }),
  onAddCategory: () => openCategoryEditor({}),
  favorites: state.favorites,
});
```

Add import:

```js
import { initSidebar, setActive as setSidebarActive, setData as setSidebarData, setFavorites as setSidebarFavorites } from "./render/sidebar.js";
```

Update `toggleFavorite` to also refresh sidebar:

```js
function toggleFavorite(linkId) {
  if (state.favorites.has(linkId)) state.favorites.delete(linkId);
  else state.favorites.add(linkId);
  overlay.favorites = [...state.favorites];
  saveOverlay(overlay);
  setGridState({});
  setSidebarFavorites(state.favorites);
}
```

Update `refreshData` to keep favorites in sync after CRUD changes:

```js
export function refreshData() {
  categories = merge(seed, overlay);
  // drop orphaned favorites (links that no longer exist)
  const allIds = new Set();
  categories.forEach((c) => c.items.forEach((l) => allIds.add(l.id)));
  state.favorites = new Set([...state.favorites].filter((id) => allIds.has(id)));
  overlay.favorites = [...state.favorites];

  setGridData(categories);
  setSidebarData(categories, state.activeCategory);
  setSidebarFavorites(state.favorites);
  attachDnD();
  renderWeather();
  if (document.getElementById("filter").value.trim()) renderSearch();
}
```

- [ ] **Step 3: Append pinned styles**

```css
.nav-section-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 0.5rem 0.75rem 0.25rem;
}
.nav-pinned {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 0.25rem;
}
.nav-pinned-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  text-decoration: none;
  color: var(--text-muted);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  transition: var(--transition);
}
.nav-pinned-item:hover {
  background: var(--surface-2);
  color: var(--text-main);
}
.nav-pinned-item .cat-dot {
  flex-shrink: 0;
}
```

- [ ] **Step 4: Add edit + delete icons to grid section headers**

In `js/render/grid.js`, take the existing header build inside the main render loop and replace the header construction with:

```js
const header = document.createElement("h2");
header.className = `category-header ${cat.color}`;
header.innerHTML = `<span class="cat-dot"></span><span class="cat-name">${cat.category}</span>`;

const addToCatBtn = document.createElement("button");
addToCatBtn.className = "cat-add-btn";
addToCatBtn.innerHTML = ICONS.plus;
addToCatBtn.title = "Add link to this category";
addToCatBtn.onclick = () => onAddToCatCb && onAddToCatCb(cat.id);
header.appendChild(addToCatBtn);

const editCatBtn = document.createElement("button");
editCatBtn.className = "cat-add-btn cat-edit-btn";
editCatBtn.innerHTML = ICONS.pencil;
editCatBtn.title = "Edit category";
editCatBtn.onclick = () => onEditCategoryCb && onEditCategoryCb(cat.id);
header.appendChild(editCatBtn);
```

Add module var + extend `initGrid` signature:

```js
let onEditCategoryCb = null;

export function initGrid({ data, state, onToggleFavorite, onEditLink, onAddLinkToCategory, onEditCategory }) {
  dataRef = data;
  stateRef = state;
  onFavoriteToggle = onToggleFavorite;
  onEditCb = onEditLink;
  onAddToCatCb = onAddLinkToCategory;
  onEditCategoryCb = onEditCategory;
  render();
}
```

Update `initGrid` call in `js/main.js`:

```js
initGrid({
  data: categories,
  state,
  onToggleFavorite: toggleFavorite,
  onEditLink: (linkId) => openLinkEditor({ linkId }),
  onAddLinkToCategory: (catId) => openLinkEditor({ defaultCategoryId: catId }),
  onEditCategory: (catId) => openCategoryEditor({ categoryId: catId }),
});
```

- [ ] **Step 5: Verify**

Reload. Pin a link (click ★ on a card) → appears under "Pinned" at top of sidebar, with its category color dot. Click the pinned item → opens in new tab. Unpin → disappears from pinned group. Hover any category section header in grid → pencil + plus buttons appear; click pencil → category editor opens. Delete a pinned link → also disappears from pinned (orphan-favorite cleanup in `refreshData`).

- [ ] **Step 6: Commit**

```bash
git add js/render/sidebar.js js/render/grid.js js/main.js styles/main.css
git commit -m "feat(ui): pinned favorites group in sidebar + grid-header edit"
```

### Task 11.1: Create help module

**Files:**
- Create: `js/help.js`
- Modify: `js/main.js`, `styles/main.css`

- [ ] **Step 1: Write `js/help.js`**

```js
// js/help.js
// In-app help side-sheet.

import { openModal, closeModal } from "./crud/modal.js";
import { save as saveOverlay } from "./storage.js";

let overlayRef = null;

export function initHelp({ overlay }) {
  overlayRef = overlay;
  const btn = document.getElementById("help-toggle");
  if (btn) btn.onclick = () => openHelp();

  document.addEventListener("keydown", (e) => {
    if (e.key === "?" && !isTypingTarget(document.activeElement)) {
      e.preventDefault();
      openHelp();
    }
    if (e.key.toLowerCase() === "t" && !isTypingTarget(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const themeBtn = document.getElementById("theme-toggle");
      if (themeBtn) themeBtn.click();
    }
  });

  // Auto-show on first run
  if (!overlayRef.settings.helpDismissed) {
    setTimeout(() => openHelp(true), 600);
  }
}

function isTypingTarget(el) {
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function openHelp(isFirstRun = false) {
  const body = document.createElement("div");
  body.className = "help-body";
  body.innerHTML = HELP_HTML;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "space-between";
  footer.style.gap = "0.5rem";

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "btn btn-ghost";
  dismissBtn.textContent = isFirstRun ? "Don't show on start" : "Don't show on start";
  dismissBtn.onclick = () => {
    overlayRef.settings.helpDismissed = true;
    saveOverlay(overlayRef);
    closeModal();
  };

  const ok = document.createElement("button");
  ok.className = "btn btn-primary";
  ok.textContent = "Got it";
  ok.onclick = closeModal;

  footer.append(dismissBtn, ok);

  openModal({ title: "Welcome to your startpage", body, footer, width: "480px" });
}

const HELP_HTML = `
<section class="help-section">
  <h3>Search</h3>
  <ul>
    <li><kbd>/</kbd> — focus search</li>
    <li>Type to live-filter your links</li>
    <li><kbd>Enter</kbd> — open top match in <em>new tab</em></li>
    <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> — open in <em>current tab</em></li>
    <li><kbd>Shift</kbd>+<kbd>Enter</kbd> — force a web search</li>
    <li>Prefixes: <code>g</code> Google · <code>d</code> DuckDuckGo · <code>y</code> YouTube · <code>gh</code> GitHub</li>
    <li>Change default engine via the chip left of the input</li>
  </ul>
</section>

<section class="help-section">
  <h3>Manage links</h3>
  <ul>
    <li><strong>+</strong> button (bottom-right) — add a link</li>
    <li>Hover a card → <strong>✎</strong> edit · <strong>★</strong> favorite</li>
    <li>Drag cards to reorder or move between categories</li>
    <li>Sidebar: <em>+ New category</em> at the bottom</li>
    <li>Hover category in sidebar → ✎ edit / delete</li>
  </ul>
</section>

<section class="help-section">
  <h3>Favorites</h3>
  <ul>
    <li>Click <strong>★</strong> on any card to pin</li>
    <li>Pinned links appear at the top of the sidebar</li>
  </ul>
</section>

<section class="help-section">
  <h3>Settings</h3>
  <ul>
    <li>Username (renames the greeting)</li>
    <li>Theme (light / dark)</li>
    <li>Weather: free OpenWeatherMap API key + city</li>
    <li>Default search engine + add custom engines with <code>%s</code> placeholder</li>
    <li>Export / Import JSON backup</li>
    <li>Reset to defaults from shortcuts.js</li>
  </ul>
</section>

<section class="help-section">
  <h3>Keyboard shortcuts</h3>
  <table class="kbd-table">
    <tr><td><kbd>/</kbd></td><td>Focus search</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>Clear / close</td></tr>
    <tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>Navigate results</td></tr>
    <tr><td><kbd>Enter</kbd></td><td>Open top match (new tab)</td></tr>
    <tr><td><kbd>Ctrl</kbd>+<kbd>Enter</kbd></td><td>Open in current tab</td></tr>
    <tr><td><kbd>Shift</kbd>+<kbd>Enter</kbd></td><td>Force web search</td></tr>
    <tr><td><kbd>?</kbd></td><td>This help</td></tr>
    <tr><td><kbd>T</kbd></td><td>Toggle theme</td></tr>
  </table>
</section>

<section class="help-section">
  <h3>Data lives in your browser</h3>
  <p>Everything is stored in <code>localStorage</code>. Use <em>Export</em> in settings to back up. No account, no server.</p>
</section>
`;
```

- [ ] **Step 2: Append help styles**

```css
.help-body { color: var(--text-main); font-size: 0.875rem; line-height: 1.55; }
.help-section { margin-bottom: 1.25rem; }
.help-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.help-section ul { padding-left: 1.25rem; margin: 0; }
.help-section li { margin: 0.25rem 0; color: var(--text-muted); }
.help-section li strong { color: var(--text-main); }
.help-section code, .help-section kbd {
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--text-main);
}
.help-section a { color: var(--accent-primary); }
.kbd-table { width: 100%; border-collapse: collapse; }
.kbd-table td { padding: 0.25rem 0.5rem 0.25rem 0; color: var(--text-muted); }
.kbd-table td:first-child { width: 130px; }
```

- [ ] **Step 3: Wire help in `js/main.js`**

Add import:

```js
import { initHelp } from "./help.js";
```

After other inits:

```js
initHelp({ overlay });
```

- [ ] **Step 4: Verify**

Reload in a fresh browser profile (so `helpDismissed` is false). Expected:
- Help panel auto-shows after ~600ms.
- Click "Don't show on start" → closes; reload → does not auto-show.
- Press `?` anywhere (not in an input) → opens.
- Click `? Help` in sidebar footer → opens.
- Press `T` (not in an input) → toggles theme.
- Inside an input, `?` and `T` work as normal text.

- [ ] **Step 5: Commit**

```bash
git add js/help.js js/main.js styles/main.css
git commit -m "feat(help): in-app help guide with first-run auto-show"
```

### Task 11.2: Rewrite README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` contents**

```markdown
# Startpage

A personal browser start page. Glassmorphic dashboard with full link CRUD, smart search, weather, and a help guide built in. No server, no build step — open `index.html` and go.

![Screenshot](/Screenshot.png)

## Install

### Local file

```bash
git clone https://github.com/Bigu93/homepage.git
```

Set your browser's new-tab / homepage to the path of `index.html` inside the repo.

### GitHub Pages

Fork the repo → Settings → Pages → Deploy from a branch → `main` / root. Use the resulting URL as your new-tab page.

## Use

- **Search** — type to filter your links. Press `Enter` to open the top match in a new tab. `Ctrl+Enter` opens in the current tab. `Shift+Enter` forces a web search.
- **Prefixes** — `g foo`, `d foo`, `y foo`, `gh foo` search Google / DuckDuckGo / YouTube / GitHub respectively. Add more in Settings.
- **Engine chip** — click the chip left of the input to switch the default engine.
- **Add link** — floating `+` bottom-right, or `+` next to a category header.
- **Edit link** — hover the card, click the pencil.
- **Favorite link** — hover the card, click the star.
- **Reorder** — drag cards within or between categories. Drag categories in the sidebar to reorder.
- **Move link** — drag a card onto a sidebar category.
- **Add category** — `+ New category` at the bottom of the sidebar.
- **Settings** — gear icon in sidebar footer. Configure username, default search engine, custom engines, weather (OpenWeatherMap API key + city), and export/import/reset your data.
- **Weather** — top-right chip. Click to configure. Free OpenWeatherMap key needed.
- **Theme** — toggle dark / light in the sidebar footer or press `T`.
- **Help** — press `?` or click the `?` in the sidebar.

## Keyboard

| Key | Action |
|---|---|
| `/` | Focus search |
| `Esc` | Clear / close |
| `↑` / `↓` | Navigate results |
| `Enter` | Open top match (new tab) |
| `Ctrl+Enter` | Open in current tab |
| `Shift+Enter` | Force web search |
| `?` | Help |
| `T` | Toggle theme |

## Data

Everything lives in your browser's `localStorage`. Use **Export** in Settings to back up. **Reset** restores defaults from `js/shortcuts.js` (keeps your settings). **Full reset** wipes settings too.

`js/shortcuts.js` is the seed — edit it directly if you want a different default link list. New entries you add via the UI live in the overlay (`localStorage` key `startpage_overlay_v1`) on top of the seed.

## Tech

Vanilla JS (ES modules), HTML, CSS. No bundler, no runtime deps, no test framework. Tested in Chromium + Firefox.

## License

See [LICENSE](LICENSE).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README to match current product"
```

### Task 11.3: Final cleanup + verification

**Files:**
- Inspect: all `js/` files, `styles/main.css`

- [ ] **Step 1: Remove dead code**

Scan `js/main.js` for orphan imports or unused vars (the old `filterInput` keydown handler may still be present from earlier phases — confirm it's gone, since `search.js` owns `/` focus now). Same for any leftover `dom = { … }` in `main.js`.

If `js/dashboard.js` still exists anywhere, `git rm` it.

Run the full spec verification checklist from [docs/superpowers/specs/2026-05-24-startpage-redesign-design.md](../specs/2026-05-24-startpage-redesign-design.md) — walk through every bullet. Anything broken: fix and commit per-fix.

- [ ] **Step 2: Verify on narrow viewport**

Resize browser to 600px wide. Expected: sidebar collapses to top row, weather chip drops to its own line, search input shrinks but works, FAB still visible bottom-right, drag-reorder via long-press works.

- [ ] **Step 3: Verify private window**

Open in a private/incognito window. Expected: app renders seed data. Click ★ → toast shown if storage blocked, or silently persists if private-mode allows localStorage. No crash either way.

- [ ] **Step 4: Final commit**

If there were cleanup fixes:

```bash
git add -A
git commit -m "chore: post-redesign cleanup"
```

### Task 11.4: Push branch + open PR

- [ ] **Step 1: Push**

```bash
git push -u origin claude/trusting-goldstine-c6378f
```

- [ ] **Step 2: Open PR (ask user first)**

Confirm with user before creating the PR. Then:

```bash
gh pr create --title "Startpage redesign: refactor + CRUD + search + weather + help" --body "$(cat <<'EOF'
## Summary

Implements the design spec at [docs/superpowers/specs/2026-05-24-startpage-redesign-design.md](docs/superpowers/specs/2026-05-24-startpage-redesign-design.md).

- Refactor `js/dashboard.js` into focused ES modules.
- Polish typography (Geist), spacing, color (slate-950 dark / stone-50 light), animations.
- Full link CRUD (add / edit / delete / drag-reorder) with localStorage overlay on top of `shortcuts.js` seed.
- Category CRUD + sidebar reorder.
- Unified smart search with engine chip, prefix shortcuts (`g`, `d`, `y`, `gh`), keyboard navigation.
- Weather widget (OpenWeatherMap, 15min cache).
- In-app help guide + rewritten README.

## Test plan

- [ ] Walk through manual verification checklist in the spec
- [ ] Verify on a narrow viewport (≤720px)
- [ ] Verify in a private window (storage may be blocked)
- [ ] Verify with no overlay (fresh profile) — help auto-shows
EOF
)"
```

---

## Final notes

- Every phase ends with a working app — pause anywhere.
- Each task is bite-sized; if any task feels too large, split it before starting.
- All file paths in this plan are relative to repo root.
- After implementation, do NOT delete this plan — leave it as a reference next to the spec.

