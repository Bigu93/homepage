import data from "./shortcuts.js";

const grid = document.getElementById("grid");
const filter = document.getElementById("filter");
const count = document.getElementById("count");
const shuffleBtn = document.getElementById("shuffle");
const compactBtn = document.getElementById("compact");

const favicon = (url) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;

const normalize = (s) => s.toLowerCase().replace(/[_-]/g, " ");

function render(items) {
  grid.innerHTML = "";

  items.forEach(cat => {
    const card = document.createElement("section");
    card.className = "card";

    const h = document.createElement("h2");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${(cat.color || "light-gray").replace(".", "")}`) || "var(--light-gray)";
    const title = document.createElement("span");
    title.className = cat.color || "light-gray";
    title.textContent = `~/${cat.category}`;

    h.append(dot, title);
    card.appendChild(h);

    const ul = document.createElement("ul");
    ul.className = "links";

    Object.entries(cat.items).forEach(([name, link]) => {
      const li = document.createElement("li");
      li.className = "link";
      const a = document.createElement("a");
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = link;

      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = favicon(link);
      img.alt = "";

      const label = document.createElement("span");
      label.textContent = name;

      a.append(img, label);
      li.appendChild(a);
      ul.appendChild(li);
    });

    card.appendChild(ul);
    grid.appendChild(card);
  });

  const totalLinks = items.reduce((n, c) => n + Object.keys(c.items).length, 0);
  count.textContent = `${items.length} groups • ${totalLinks} links`;
}

function filterData(q) {
  if (!q) return data;
  const n = normalize(q);
  return data
    .map(cat => {
      const filteredEntries = Object.entries(cat.items).filter(([name, url]) =>
        normalize(name).includes(n) ||
        normalize(cat.category).includes(n) ||
        url.toLowerCase().includes(n)
      );
      if (filteredEntries.length === 0) return null;
      return { ...cat, items: Object.fromEntries(filteredEntries) };
    })
    .filter(Boolean);
}

filter.addEventListener("input", (e) => render(filterData(e.target.value)));

shuffleBtn.addEventListener("click", () => {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  render(filter.value ? filterData(filter.value) : shuffled);
});

compactBtn.addEventListener("click", () => {
  document.body.classList.toggle("compact");
});

window.addEventListener("load", () => {
  const root = document.documentElement;
  root.style.backgroundImage = `url("./backgrounds/null_byte.jpg")`;
  root.style.backgroundSize = "contain";
  root.style.backgroundRepeat = "no-repeat";
  root.style.backgroundPosition = "center";

  render(data);
});
