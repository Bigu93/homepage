// js/search.js
// Unified smart search: live shortcut filter + web search fallback + engine prefixes.

import { getFavicon } from "./favicons.js";
import {
  getAllEngines,
  resolveEngine,
  searchUrl,
  detectPrefix,
} from "./engines.js";
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
    if (
      e.key === "/" &&
      document.activeElement !== input &&
      !isTypingTarget(document.activeElement)
    ) {
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
    chipLabel.textContent = detected.prefix.short || detected.prefix.label;
    chip.classList.add("override");
  } else {
    const eng = resolveEngine(getDefaultEngineFn(), overlayRef);
    chipLabel.textContent = eng.short || eng.label;
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
    window.open(
      searchUrl(detected.prefix.urlTemplate, detected.query),
      "_blank",
    );
    return;
  }
  const eng = resolveEngine(getDefaultEngineFn(), overlayRef);
  window.open(searchUrl(eng.urlTemplate, query), "_blank");
}

function score(name, url, q) {
  const n = name.toLowerCase(),
    u = url.toLowerCase();
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
        if (s > 0)
          matches.push({
            kind: "shortcut",
            linkId: it.id,
            name: it.name,
            url: it.url,
            category: cat.category,
            _score: s,
          });
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
  const webIcon = document.createElement("div");
  webIcon.className = "link-favicon";
  const webSym = document.createElement("span");
  webSym.style.fontSize = "14px";
  webSym.textContent = "↵";
  webIcon.appendChild(webSym);
  const webText = document.createElement("span");
  webText.textContent = webLabel;
  webRow.append(webIcon, webText);
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
    const favWrap = document.createElement("div");
    favWrap.className = "link-favicon";
    const img = document.createElement("img");
    img.src = getFavicon(m.url);
    img.alt = "";
    favWrap.appendChild(img);
    const nameSpan = document.createElement("span");
    nameSpan.textContent = m.name;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = m.category;
    row.append(favWrap, nameSpan, meta);
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
