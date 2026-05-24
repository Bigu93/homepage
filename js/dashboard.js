import data from "./shortcuts.js";
import { ICONS } from "./icons.js";
import { getFavicon, clearExpiredFavicons } from "./favicons.js";
import { startClock } from "./clock.js";
import { initTheme } from "./theme.js";

/* =========================
   State & DOM
========================= */
const state = {
  activeCategory: "all",
  searchQuery: "",
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
};

const dom = {
  sidebarCats: document.getElementById("sidebar-categories"),
  viewContainer: document.getElementById("view-container"),
  filterInput: document.getElementById("filter"),
  sidebarNav: document.querySelector(".sidebar-nav"),
};

/* =========================
   Logic
 ========================= */

function renderSidebar() {
  dom.sidebarCats.innerHTML = "";
  data.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `nav-item ${state.activeCategory === cat.category ? "active" : ""}`;
    btn.onclick = () => setActiveCategory(cat.category);

    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
    iconSpan.innerHTML = ICONS[cat.icon] || ICONS.default;

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = cat.category;

    btn.append(iconSpan, labelSpan);
    dom.sidebarCats.appendChild(btn);
  });
}

function setActiveCategory(cat) {
  state.activeCategory = cat;

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
    const isAll = cat === "all" && el.dataset.cat === "all";
    const isCat = el.textContent.trim() === cat;
    if (isAll || isCat) el.classList.add("active");
  });

  renderView();
}

function renderLinkCard(name, url, categoryColor) {
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
  favBtn.className = `fav-btn ${state.favorites.has(url) ? "active" : ""}`;
  favBtn.innerHTML = ICONS.star;
  favBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.favorites.has(url)) state.favorites.delete(url);
    else state.favorites.add(url);
    localStorage.setItem("favorites", JSON.stringify([...state.favorites]));
    renderView();
  };

  card.append(icon, title, favBtn);
  return card;
}

function renderView() {
  dom.viewContainer.innerHTML = "";
  const query = state.searchQuery.toLowerCase();

  let filteredData = data;

  if (query) {
    const allLinks = [];
    data.forEach((cat) => {
      Object.entries(cat.items).forEach(([name, url]) => {
        if (
          name.toLowerCase().includes(query) ||
          url.toLowerCase().includes(query)
        ) {
          allLinks.push({
            name,
            url,
            category: cat.category,
            color: cat.color,
          });
        }
      });
    });

    if (allLinks.length === 0) {
      dom.viewContainer.innerHTML = `<div class="empty-state">No results found for "${state.searchQuery}"</div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid-view";
    allLinks.forEach((link) => {
      grid.appendChild(renderLinkCard(link.name, link.url, link.color));
    });
    dom.viewContainer.appendChild(grid);
    return;
  }

  if (state.activeCategory !== "all") {
    filteredData = data.filter((c) => c.category === state.activeCategory);
  }

  filteredData.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";

    const header = document.createElement("h2");
    header.className = `category-header ${cat.color}`;
    header.innerHTML = `<span class="cat-dot"></span>${cat.category}`;

    const grid = document.createElement("div");
    grid.className = "grid-view";

    Object.entries(cat.items).forEach(([name, url]) => {
      grid.appendChild(renderLinkCard(name, url, cat.color));
    });

    section.append(header, grid);
    dom.viewContainer.appendChild(section);
  });
}

dom.filterInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  renderView();
});

document.querySelector('[data-cat="all"]').onclick = () =>
  setActiveCategory("all");

clearExpiredFavicons();
startClock("Marcin");
initTheme();
renderSidebar();
renderView();

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== dom.filterInput) {
    e.preventDefault();
    dom.filterInput.focus();
  }
});
