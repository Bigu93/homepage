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
