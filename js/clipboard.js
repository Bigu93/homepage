/* =========================
   Quick Clipboard Module
   ========================= */

const STORAGE_KEY = "clipboard_snippets";
const PANEL_VISIBLE_KEY = "clipboard_panel_visible";

/* State */
const clipboardState = {
  snippets: [],
  searchQuery: "",
  activeCategory: "all",
  categories: new Set(),
  isPanelVisible: localStorage.getItem(PANEL_VISIBLE_KEY) === "true",
};

/* DOM Elements */
const dom = {
  panel: null,
  toggleBtn: null,
  input: null,
  categorySelect: null,
  searchInput: null,
  list: null,
  addBtn: null,
  emptyState: null,
};

/* Icons */
const ICONS = {
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
};

/* =========================
   Data Management
   ========================= */

function loadSnippets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    clipboardState.snippets = stored ? JSON.parse(stored) : [];
    updateCategories();
  } catch (e) {
    console.error("Failed to load snippets:", e);
    clipboardState.snippets = [];
  }
}

function saveSnippets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clipboardState.snippets));
  } catch (e) {
    console.error("Failed to save snippets:", e);
  }
}

function updateCategories() {
  clipboardState.categories.clear();
  clipboardState.snippets.forEach((s) => {
    if (s.category) {
      clipboardState.categories.add(s.category);
    }
  });
  updateCategorySelect();
}

function updateCategorySelect() {
  if (!dom.categorySelect) return;
  
  const currentValue = dom.categorySelect.value;
  dom.categorySelect.innerHTML = '<option value="">No Category</option>';
  
  Array.from(clipboardState.categories).sort().forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    dom.categorySelect.appendChild(option);
  });
  
  if (currentValue && Array.from(clipboardState.categories).includes(currentValue)) {
    dom.categorySelect.value = currentValue;
  }
}

/* =========================
   CRUD Operations
   ========================= */

function addSnippet(text, category) {
  const snippet = {
    id: Date.now(),
    text: text.trim(),
    category: category || "",
    createdAt: Date.now(),
  };
  
  clipboardState.snippets.unshift(snippet);
  saveSnippets();
  updateCategories();
  renderSnippets();
  clearInput();
}

function updateSnippet(id, text, category) {
  const index = clipboardState.snippets.findIndex((s) => s.id === id);
  if (index !== -1) {
    clipboardState.snippets[index].text = text.trim();
    clipboardState.snippets[index].category = category || "";
    saveSnippets();
    updateCategories();
    renderSnippets();
  }
}

function deleteSnippet(id) {
  clipboardState.snippets = clipboardState.snippets.filter((s) => s.id !== id);
  saveSnippets();
  updateCategories();
  renderSnippets();
}

/* =========================
   Clipboard Operations
   ========================= */

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  } catch (e) {
    console.error("Failed to copy:", e);
    showToast("Failed to copy", true);
  }
}

/* =========================
   UI Rendering
   ========================= */

function renderSnippets() {
  if (!dom.list) return;
  
  dom.list.innerHTML = "";
  
  const filtered = getFilteredSnippets();
  
  if (filtered.length === 0) {
    dom.emptyState.style.display = "block";
    return;
  }
  
  dom.emptyState.style.display = "none";
  
  filtered.forEach((snippet) => {
    const item = document.createElement("div");
    item.className = "clipboard-item";
    item.dataset.id = snippet.id;
    
    const content = document.createElement("div");
    content.className = "clipboard-content";
    
    const text = document.createElement("div");
    text.className = "clipboard-text";
    text.textContent = snippet.text;
    text.title = snippet.text;
    
    const meta = document.createElement("div");
    meta.className = "clipboard-meta";
    
    if (snippet.category) {
      const badge = document.createElement("span");
      badge.className = "clipboard-badge";
      badge.textContent = snippet.category;
      meta.appendChild(badge);
    }
    
    content.appendChild(text);
    content.appendChild(meta);
    
    const actions = document.createElement("div");
    actions.className = "clipboard-actions";
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "clipboard-action-btn copy-btn";
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.title = "Copy to clipboard";
    copyBtn.onclick = () => copyToClipboard(snippet.text);
    
    const editBtn = document.createElement("button");
    editBtn.className = "clipboard-action-btn edit-btn";
    editBtn.innerHTML = ICONS.edit;
    editBtn.title = "Edit snippet";
    editBtn.onclick = () => editSnippet(snippet);
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "clipboard-action-btn delete-btn";
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.title = "Delete snippet";
    deleteBtn.onclick = () => {
      if (confirm("Delete this snippet?")) {
        deleteSnippet(snippet.id);
      }
    };
    
    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(content);
    item.appendChild(actions);
    
    dom.list.appendChild(item);
  });
}

function getFilteredSnippets() {
  let filtered = [...clipboardState.snippets];
  
  if (clipboardState.searchQuery) {
    const query = clipboardState.searchQuery.toLowerCase();
    filtered = filtered.filter((s) =>
      s.text.toLowerCase().includes(query) ||
      (s.category && s.category.toLowerCase().includes(query))
    );
  }
  
  if (clipboardState.activeCategory !== "all") {
    filtered = filtered.filter((s) => s.category === clipboardState.activeCategory);
  }
  
  return filtered;
}

function clearInput() {
  if (dom.input) dom.input.value = "";
  if (dom.categorySelect) dom.categorySelect.value = "";
}

function editSnippet(snippet) {
  if (!dom.input || !dom.categorySelect) return;
  
  dom.input.value = snippet.text;
  dom.categorySelect.value = snippet.category;
  dom.input.focus();
  
  deleteSnippet(snippet.id);
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `clipboard-toast ${isError ? "error" : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/* =========================
   Panel Toggle
   ========================= */

function togglePanel() {
  clipboardState.isPanelVisible = !clipboardState.isPanelVisible;
  localStorage.setItem(PANEL_VISIBLE_KEY, clipboardState.isPanelVisible);
  updatePanelVisibility();
}

function updatePanelVisibility() {
  if (!dom.panel) return;
  
  if (clipboardState.isPanelVisible) {
    dom.panel.classList.add("visible");
    dom.toggleBtn?.classList.add("active");
  } else {
    dom.panel.classList.remove("visible");
    dom.toggleBtn?.classList.remove("active");
  }
}

/* =========================
   Initialization
   ========================= */

function initClipboard() {
  dom.panel = document.createElement("div");
  dom.panel.className = "clipboard-panel";
  if (clipboardState.isPanelVisible) {
    dom.panel.classList.add("visible");
  }
  
  dom.panel.innerHTML = `
    <div class="clipboard-header">
      <h3>Quick Clipboard</h3>
      <button class="clipboard-close" title="Close panel">${ICONS.close}</button>
    </div>
    
    <div class="clipboard-input-wrap">
      <input type="text" class="clipboard-input" placeholder="Add new snippet..." autocomplete="off" />
      <select class="clipboard-category">
        <option value="">No Category</option>
      </select>
      <button class="clipboard-add-btn" title="Add snippet">${ICONS.plus}</button>
    </div>
    
    <div class="clipboard-filter-wrap">
      <input type="text" class="clipboard-search" placeholder="Search snippets..." autocomplete="off" />
    </div>
    
    <div class="clipboard-list"></div>
    <div class="clipboard-empty">No snippets yet. Add one above!</div>
  `;
  
  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.appendChild(dom.panel);
  }
  
  dom.input = dom.panel.querySelector(".clipboard-input");
  dom.categorySelect = dom.panel.querySelector(".clipboard-category");
  dom.searchInput = dom.panel.querySelector(".clipboard-search");
  dom.list = dom.panel.querySelector(".clipboard-list");
  dom.emptyState = dom.panel.querySelector(".clipboard-empty");
  dom.addBtn = dom.panel.querySelector(".clipboard-add-btn");
  const closeBtn = dom.panel.querySelector(".clipboard-close");
  
  dom.addBtn.onclick = () => {
    const text = dom.input.value.trim();
    const category = dom.categorySelect.value;
    if (text) {
      addSnippet(text, category);
    }
  };
  
  dom.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = dom.input.value.trim();
      const category = dom.categorySelect.value;
      if (text) {
        addSnippet(text, category);
      }
    }
  });
  
  dom.searchInput.addEventListener("input", (e) => {
    clipboardState.searchQuery = e.target.value;
    renderSnippets();
  });
  
  closeBtn.onclick = togglePanel;
  
  dom.toggleBtn = document.createElement("button");
  dom.toggleBtn.className = `nav-item ${clipboardState.isPanelVisible ? "active" : ""}`;
  dom.toggleBtn.innerHTML = `
    <span class="icon">${ICONS.clipboard}</span>
    <span class="label">Clipboard</span>
  `;
  dom.toggleBtn.onclick = togglePanel;
  
  const sidebarFooter = document.querySelector(".sidebar-footer");
  const configControls = document.querySelector(".config-controls");
  if (sidebarFooter && configControls) {
    sidebarFooter.insertBefore(dom.toggleBtn, configControls);
  } else if (sidebarFooter) {
    sidebarFooter.appendChild(dom.toggleBtn);
  }
  
  loadSnippets();
  renderSnippets();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClipboard);
} else {
  initClipboard();
}

export { clipboardState, addSnippet, deleteSnippet, copyToClipboard };
