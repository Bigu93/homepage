import data from "./shortcuts.js";

const grid = document.getElementById("grid");
const filter = document.getElementById("filter");
const count = document.getElementById("count");
const shuffleBtn = document.getElementById("shuffle");
const compactBtn = document.getElementById("compact");
const collapseAllBtn = document.getElementById("collapseAll");
const expandAllBtn = document.getElementById("expandAll");

/* =========================
   Local storage helpers
========================= */
const LS = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const favorites = new Set(LS.get("favorites", []));
const collapsed = new Set(LS.get("collapsedCategories", []));
const stats = LS.get("linkStats", {});

/* =========================
   Utilities
========================= */
const favicon = (url) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;

const normalize = (s) => s.toLowerCase().replace(/[_-]/g, " ");

function saveState() {
  LS.set("favorites", [...favorites]);
  LS.set("collapsedCategories", [...collapsed]);
  LS.set("linkStats", stats);
}

function timeAgo(t) {
  if (!t) return "";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

/* =========================
   Filtering
========================= */
function filterData(q) {
  if (!q) return data;
  const n = normalize(q);
  return data
    .map((cat) => {
      const filtered = Object.entries(cat.items).filter(([name, url]) =>
        normalize(name).includes(n) ||
        normalize(cat.category).includes(n) ||
        url.toLowerCase().includes(n)
      );
      if (filtered.length === 0) return null;
      return { ...cat, items: Object.fromEntries(filtered) };
    })
    .filter(Boolean);
}

/* =========================
   Render
========================= */
function buildLink(name, link) {
  const li = document.createElement("li");
  li.className = "link";

  const a = document.createElement("a");
  a.href = link;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.title = link;
  a.dataset.url = link;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.src = favicon(link);
  img.alt = "";

  const label = document.createElement("span");
  label.textContent = name;

  const badgeWrap = document.createElement("span");
  badgeWrap.className = "badge-wrap";
  const s = stats[link];
  const countBadge = document.createElement("span");
  countBadge.className = "badge";
  countBadge.textContent = String(s?.count ?? 0);
  countBadge.title = s?.last ? `Last: ${new Date(s.last).toLocaleString()}` : "Never opened";
  badgeWrap.appendChild(countBadge);

  const star = document.createElement("button");
  star.type = "button";
  star.className = "star";
  star.setAttribute("aria-label", "Toggle favorite");
  star.title = "Add/remove favorite";
  if (favorites.has(link)) star.classList.add("on");
  star.addEventListener("click", (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (favorites.has(link)) favorites.delete(link);
    else favorites.add(link);
    star.classList.toggle("on");
    saveState();
    render(currentItems);
  });

  a.addEventListener("click", () => {
    stats[link] = { count: (stats[link]?.count || 0) + 1, last: Date.now() };
    saveState();
    countBadge.textContent = String(stats[link].count);
    countBadge.title = `Last: ${new Date(stats[link].last).toLocaleString()}`;
  });

  a.append(img, label, badgeWrap, star);
  li.appendChild(a);
  return li;
}

function buildCard(category) {
  const card = document.createElement("section");
  card.className = "card";
  if (collapsed.has(category.category)) card.classList.add("is-collapsed");

  const h = document.createElement("h2");
  const dot = document.createElement("span");
  dot.className = "dot";
  const title = document.createElement("button");
  title.className = `card-title ${category.color || "light-gray"}`;
  title.textContent = `~/${category.category}`;
  title.type = "button";
  title.title = "Collapse/expand";

  title.addEventListener("click", () => {
    if (collapsed.has(category.category)) collapsed.delete(category.category);
    else collapsed.add(category.category);
    saveState();
    card.classList.toggle("is-collapsed");
  });

  h.append(dot, title);
  card.appendChild(h);

  const ul = document.createElement("ul");
  ul.className = "links";

  Object.entries(category.items).forEach(([name, link]) => {
    ul.appendChild(buildLink(name, link));
  });

  card.appendChild(ul);
  return card;
}

function buildPinnedRow(items) {
  const favs = items
    .flatMap((cat) => Object.entries(cat.items))
    .filter(([_, link]) => favorites.has(link));

  if (favs.length === 0) return null;

  const card = document.createElement("section");
  card.className = "card pinned";
  const h = document.createElement("h2");
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.color = "var(--yellow)";
  const title = document.createElement("span");
  title.className = "yellow";
  title.textContent = "~/Pinned";
  h.append(dot, title);
  card.appendChild(h);

  const ul = document.createElement("ul");
  ul.className = "links pinned-links";
  favs.forEach(([name, link]) => {
    ul.appendChild(buildLink(name, link));
  });
  card.appendChild(ul);
  return card;
}

let currentItems = data;

function render(items) {
  currentItems = items;
  grid.innerHTML = "";

  const pinned = buildPinnedRow(items);
  if (pinned) grid.appendChild(pinned);

  items.forEach((cat) => grid.appendChild(buildCard(cat)));

  const totalLinks = items.reduce((n, c) => n + Object.keys(c.items).length, 0);
  count.textContent = `${items.length} groups • ${totalLinks} links • ${favorites.size} favorites`;

  refreshKeyboardIndex();
}

/* =========================
   Collapse/Expand all
========================= */
function setAllCollapsed(items, shouldCollapse) {
  collapsed.clear();
  if (shouldCollapse) items.forEach((c) => collapsed.add(c.category));
  saveState();
  render(currentItems);
}

/* =========================
   Keyboard quick-open
========================= */
let linkList = [];
let selIndex = -1;

function refreshKeyboardIndex() {
  linkList = [...grid.querySelectorAll(".links a")].filter(el => el.offsetParent !== null);
  selIndex = -1;
}

function applySelection() {
  linkList.forEach((a) => a.classList.remove("kbd-focus"));
  if (selIndex >= 0 && linkList[selIndex]) {
    const el = linkList[selIndex];
    el.classList.add("kbd-focus");
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function openSelected(newTab = true) {
  if (selIndex < 0 || !linkList[selIndex]) return;
  const href = linkList[selIndex].href;
  linkList[selIndex].click();
  if (newTab) window.open(href, "_blank", "noopener");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== filter) {
    e.preventDefault();
    filter.focus();
    return;
  }

  if (!isNaN(e.key) && e.key !== "0" && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const idx = parseInt(e.key, 10) - 1;
    if (linkList[idx]) {
      e.preventDefault();
      selIndex = idx;
      applySelection();
      openSelected(true);
    }
    return;
  }

  const typing = document.activeElement === filter;
  if (!typing) {
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      selIndex = Math.min(linkList.length - 1, selIndex + 1);
      applySelection();
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      selIndex = Math.max(-1, selIndex - 1);
      applySelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      openSelected(true);
    } else if (e.key === "Escape") {
      selIndex = -1; applySelection();
    }
    else if (e.key.toLowerCase() === "c") {
      setAllCollapsed(currentItems, true);
    } else if (e.key.toLowerCase() === "u") {
      setAllCollapsed(currentItems, false);
    }
  }
});

/* =========================
   Events
========================= */
filter.addEventListener("input", (e) => render(filterData(e.target.value)));
shuffleBtn.addEventListener("click", () => {
  const base = filter.value ? filterData(filter.value) : data;
  const shuffled = [...base].sort(() => Math.random() - 0.5);
  render(shuffled);
});
compactBtn.addEventListener("click", () => {
  document.body.classList.toggle("compact");
});
collapseAllBtn?.addEventListener("click", () => setAllCollapsed(currentItems, true));
expandAllBtn?.addEventListener("click", () => setAllCollapsed(currentItems, false));

window.addEventListener("load", () => {
  render(data);
});
