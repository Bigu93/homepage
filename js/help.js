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
    if (
      e.key.toLowerCase() === "t" &&
      !isTypingTarget(document.activeElement) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
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
  return (
    el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
  );
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
  dismissBtn.textContent = isFirstRun
    ? "Don't show on start"
    : "Don't show on start";
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

  openModal({
    title: "Welcome to your startpage",
    body,
    footer,
    width: "480px",
  });
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
