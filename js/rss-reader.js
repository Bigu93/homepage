/* =========================
   RSS Feed Reader Module
   ========================= */

const STORAGE_KEY = "rss_reader_data";
const CORS_PROXIES = [
  "https://api.allorigins.win/get?url=",
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest="
];
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

/* =========================
   State & DOM
   ========================= */
const state = {
  feeds: [],
  items: [],
  activeCategory: "all",
  isRefreshing: false,
};

const dom = {
  rssSection: null,
  rssHeader: null,
  addFeedBtn: null,
  refreshBtn: null,
  categoryFilter: null,
  rssGrid: null,
  addFeedModal: null,
  addFeedModalTitle: null,
  addFeedModalClose: null,
  feedUrlInput: null,
  feedNameInput: null,
  feedCategoryInput: null,
  cancelFeedBtn: null,
  saveFeedBtn: null,
};

/* =========================
   Data Management
   ========================= */

function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      state.feeds = parsed.feeds || [];
      state.items = parsed.items || [];
    }
  } catch (e) {
    console.error("Failed to load RSS data:", e);
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      feeds: state.feeds,
      items: state.items,
    }));
  } catch (e) {
    console.error("Failed to save RSS data:", e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/* =========================
   RSS Parsing
   ========================= */

async function fetchRSSFeed(url) {
  let lastError = null;
  
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[i];
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/xml, application/xml, */*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.contents) {
        throw new Error("No content received from proxy");
      }
      
      return data.contents;
    } catch (error) {
      lastError = error;
      console.warn(`Proxy ${i + 1}/${CORS_PROXIES.length} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error(`All proxies failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

function validateFeedXML(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    return { valid: false, error: 'Invalid content type' };
  }
  
  const trimmed = xmlString.trim();
  if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<rss') && !trimmed.startsWith('<feed')) {
    return { valid: false, error: 'Not a valid RSS/Atom feed' };
  }
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    return { valid: false, error: 'XML parsing error: ' + parserError.textContent };
  }
  
  const rssElement = xmlDoc.querySelector('rss');
  const feedElement = xmlDoc.querySelector('feed');
  
  if (!rssElement && !feedElement) {
    return { valid: false, error: 'Missing RSS or Atom root element' };
  }
  
  const items = xmlDoc.querySelectorAll('item');
  const entries = xmlDoc.querySelectorAll('entry');
  
  if (items.length === 0 && entries.length === 0) {
    return { valid: false, error: 'Feed contains no items' };
  }
  
  return { valid: true };
}

function parseRSSXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  const items = [];
  
  const rssItems = xmlDoc.querySelectorAll("item");
  const atomEntries = xmlDoc.querySelectorAll("entry");
  
  const allItems = rssItems.length > 0 ? rssItems : atomEntries;
  
  allItems.forEach((item) => {
    const title = item.querySelector("title")?.textContent || "";
    let description = item.querySelector("description")?.textContent ||
                     item.querySelector("content")?.textContent ||
                     item.querySelector("summary")?.textContent || "";
    let link = item.querySelector("link")?.textContent ||
               item.querySelector("link")?.getAttribute("href") || "";
    const pubDate = item.querySelector("pubDate")?.textContent ||
                    item.querySelector("published")?.textContent ||
                    item.querySelector("updated")?.textContent || "";
    
    if (title) {
      items.push({
        title: title.trim(),
        description: description.trim().replace(/<[^>]*>/g, "").substring(0, 200),
        link: link.trim(),
        pubDate: pubDate ? new Date(pubDate).getTime() : Date.now(),
      });
    }
  });
  
  return items;
}

async function refreshFeed(feed) {
  try {
    const xmlContent = await fetchRSSFeed(feed.url);
    
    const validation = validateFeedXML(xmlContent);
    if (!validation.valid) {
      throw new Error(`Invalid feed: ${validation.error}`);
    }
    
    const parsedItems = parseRSSXML(xmlContent);
    
    if (parsedItems.length === 0) {
      throw new Error("No items found in feed");
    }
    
    feed.lastFetched = Date.now();
    
    parsedItems.forEach((item) => {
      const existingItem = state.items.find(
        (i) => i.link === item.link && i.feedId === feed.id
      );
      
      if (!existingItem) {
        state.items.unshift({
          id: generateId(),
          feedId: feed.id,
          ...item,
          read: false,
        });
      }
    });
    
    const feedItems = state.items.filter((i) => i.feedId === feed.id);
    if (feedItems.length > 100) {
      const toRemove = feedItems.slice(100);
      state.items = state.items.filter((i) => !toRemove.includes(i));
    }
    
    saveData();
    return parsedItems.length;
  } catch (error) {
    console.error(`Failed to refresh feed ${feed.name}:`, error);
    throw error;
  }
}

async function refreshAllFeeds() {
  if (state.isRefreshing) return;
  
  state.isRefreshing = true;
  updateRefreshButton();
  showLoadingState();
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const feed of state.feeds) {
    try {
      const count = await refreshFeed(feed);
      results.push({ feed, count, error: null });
      successCount++;
    } catch (error) {
      results.push({ feed, count: 0, error });
      errorCount++;
      showErrorToast(`Failed to load "${feed.name}": ${error.message}`);
    }
  }
  
  state.isRefreshing = false;
  updateRefreshButton();
  hideLoadingState();
  
  renderRSS();
  
  if (successCount > 0) {
    showSuccessToast(`Refreshed ${successCount} feed${successCount > 1 ? 's' : ''} successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
  } else if (errorCount > 0) {
    showErrorToast(`Failed to refresh ${errorCount} feed${errorCount > 1 ? 's' : ''}`);
  }
  
  return results;
}

/* =========================
   UI Rendering
   ========================= */

function getCategories() {
  const categories = new Set(state.feeds.map((f) => f.category));
  return ["all", ...Array.from(categories).sort()];
}

function renderCategoryFilter() {
  if (!dom.categoryFilter) return;
  
  const categories = getCategories();
  dom.categoryFilter.innerHTML = "";
  
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat === "all" ? "All Feeds" : cat;
    if (cat === state.activeCategory) option.selected = true;
    dom.categoryFilter.appendChild(option);
  });
}

function formatPubDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return minutes < 1 ? "Just now" : `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  return date.toLocaleDateString();
}

function renderRSSItem(item) {
  const feed = state.feeds.find((f) => f.id === item.feedId);
  if (!feed) return null;
  
  const card = document.createElement("a");
  card.href = item.link;
  card.className = `rss-item ${item.read ? "read" : "unread"}`;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  
  const header = document.createElement("div");
  header.className = "rss-item-header";
  
  const feedBadge = document.createElement("span");
  feedBadge.className = "rss-feed-badge";
  feedBadge.textContent = feed.name;
  
  const date = document.createElement("span");
  date.className = "rss-item-date";
  date.textContent = formatPubDate(item.pubDate);
  
  header.append(feedBadge, date);
  
  const title = document.createElement("h4");
  title.className = "rss-item-title";
  title.textContent = item.title;
  
  const description = document.createElement("p");
  description.className = "rss-item-description";
  description.textContent = item.description;
  
  const actions = document.createElement("div");
  actions.className = "rss-item-actions";
  
  const markReadBtn = document.createElement("button");
  markReadBtn.className = "rss-action-btn";
  markReadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  markReadBtn.title = item.read ? "Mark as unread" : "Mark as read";
  markReadBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItemRead(item.id);
  };
  
  actions.appendChild(markReadBtn);
  
  card.append(header, title, description, actions);
  
  card.onclick = (e) => {
    if (e.target.closest(".rss-action-btn")) return;
    markItemAsRead(item.id);
  };
  
  return card;
}

function renderRSS() {
  if (!dom.rssGrid) return;
  
  dom.rssGrid.innerHTML = "";
  
  let filteredItems = state.items;
  
  if (state.activeCategory !== "all") {
    const categoryFeedIds = state.feeds
      .filter((f) => f.category === state.activeCategory)
      .map((f) => f.id);
    filteredItems = filteredItems.filter((i) => categoryFeedIds.includes(i.feedId));
  }
  
  filteredItems.sort((a, b) => b.pubDate - a.pubDate);
  
  filteredItems = filteredItems.slice(0, 50);
  
  if (filteredItems.length === 0) {
    dom.rssGrid.innerHTML = `
      <div class="rss-empty">
        <p>No RSS items found.</p>
        ${state.feeds.length === 0 ? '<p>Click the + button to add your first feed.</p>' : ''}
      </div>
    `;
    return;
  }
  
  filteredItems.forEach((item) => {
    const itemEl = renderRSSItem(item);
    if (itemEl) dom.rssGrid.appendChild(itemEl);
  });
  
  updateUnreadCount();
}

function updateUnreadCount() {
  const unreadCount = state.items.filter((i) => !i.read).length;
  
  if (dom.rssHeader) {
    const badge = dom.rssHeader.querySelector(".rss-unread-badge");
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "flex" : "none";
    }
  }
}

function updateRefreshButton() {
  if (!dom.refreshBtn) return;
  
  if (state.isRefreshing) {
    dom.refreshBtn.classList.add("spinning");
    dom.refreshBtn.disabled = true;
  } else {
    dom.refreshBtn.classList.remove("spinning");
    dom.refreshBtn.disabled = false;
  }
}

/* =========================
   Toast Notifications
   ========================= */

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.rss-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `rss-toast rss-toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('visible'), 10);
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showSuccessToast(message) {
  showToast(message, 'success');
}

function showErrorToast(message) {
  showToast(message, 'error');
}

function showInfoToast(message) {
  showToast(message, 'info');
}

/* =========================
   Loading States
   ========================= */

function showLoadingState() {
  if (dom.rssGrid) {
    dom.rssGrid.classList.add('loading');
    const existingLoader = dom.rssGrid.querySelector('.rss-loader');
    if (!existingLoader) {
      const loader = document.createElement('div');
      loader.className = 'rss-loader';
      loader.innerHTML = `
        <div class="rss-spinner"></div>
        <p>Loading feeds...</p>
      `;
      dom.rssGrid.prepend(loader);
    }
  }
}

function hideLoadingState() {
  if (dom.rssGrid) {
    dom.rssGrid.classList.remove('loading');
    const loader = dom.rssGrid.querySelector('.rss-loader');
    if (loader) {
      loader.remove();
    }
  }
}

/* =========================
   Actions
   ========================= */

function markItemAsRead(itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (item) {
    item.read = true;
    saveData();
    renderRSS();
  }
}

function toggleItemRead(itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (item) {
    item.read = !item.read;
    saveData();
    renderRSS();
  }
}

function markAllAsRead() {
  state.items.forEach((item) => {
    item.read = true;
  });
  saveData();
  renderRSS();
}

async function addFeed(url, name, category) {
  if (!url || !name) {
    showErrorToast("Please provide both URL and name for the feed.");
    return false;
  }
  
  if (state.feeds.some((f) => f.url === url)) {
    showErrorToast("This feed URL is already added.");
    return false;
  }
  
  const feed = {
    id: generateId(),
    url: url.trim(),
    name: name.trim(),
    category: category.trim() || "General",
    lastFetched: 0,
  };
  
  state.feeds.push(feed);
  saveData();
  
  showLoadingState();
  try {
    const count = await refreshFeed(feed);
    showSuccessToast(`Added "${feed.name}" with ${count} items`);
    renderCategoryFilter();
    renderRSS();
  } catch (error) {
    console.error("Failed to fetch initial feed data:", error);
    showErrorToast(`Failed to fetch feed data: ${error.message}. The feed has been added but may not work correctly.`);
  } finally {
    hideLoadingState();
  }
  
  return true;
}

function deleteFeed(feedId) {
  if (!confirm("Are you sure you want to delete this feed?")) return;
  
  const feed = state.feeds.find(f => f.id === feedId);
  state.feeds = state.feeds.filter((f) => f.id !== feedId);
  state.items = state.items.filter((i) => i.feedId !== feedId);
  
  saveData();
  renderCategoryFilter();
  renderRSS();
  
  if (feed) {
    showSuccessToast(`Deleted "${feed.name}"`);
  }
}

/* =========================
   Modal Management
   ========================= */

function showAddFeedModal() {
  if (dom.addFeedModal) {
    dom.addFeedModal.classList.add("visible");
    dom.addFeedModalTitle.textContent = "Add RSS Feed";
    dom.feedUrlInput.value = "";
    dom.feedNameInput.value = "";
    dom.feedCategoryInput.value = "General";
    dom.feedUrlInput.focus();
  }
}

function hideAddFeedModal() {
  if (dom.addFeedModal) {
    dom.addFeedModal.classList.remove("visible");
  }
}

function handleSaveFeed() {
  const url = dom.feedUrlInput.value.trim();
  const name = dom.feedNameInput.value.trim();
  const category = dom.feedCategoryInput.value.trim();
  
  if (addFeed(url, name, category)) {
    hideAddFeedModal();
  }
}

/* =========================
   Initialization
   ========================= */

function initRSSReader() {
  dom.rssSection = document.getElementById("rss-section");
  dom.rssHeader = dom.rssSection?.querySelector(".rss-header");
  dom.addFeedBtn = document.getElementById("add-feed-btn");
  dom.refreshBtn = document.getElementById("refresh-feeds-btn");
  dom.categoryFilter = document.getElementById("rss-category-filter");
  dom.rssGrid = document.getElementById("rss-grid");
  
  dom.addFeedModal = document.getElementById("rss-feed-modal");
  dom.addFeedModalTitle = document.getElementById("rss-feed-modal-title");
  dom.addFeedModalClose = document.getElementById("rss-feed-modal-close");
  dom.feedUrlInput = document.getElementById("feed-url-input");
  dom.feedNameInput = document.getElementById("feed-name-input");
  dom.feedCategoryInput = document.getElementById("feed-category-input");
  dom.cancelFeedBtn = document.getElementById("cancel-feed-btn");
  dom.saveFeedBtn = document.getElementById("save-feed-btn");
  
  if (!dom.rssSection) {
    console.warn("RSS section not found");
    return;
  }
  
  loadData();
  
  dom.addFeedBtn?.addEventListener("click", showAddFeedModal);
  dom.refreshBtn?.addEventListener("click", refreshAllFeeds);
  dom.categoryFilter?.addEventListener("change", (e) => {
    state.activeCategory = e.target.value;
    renderRSS();
  });
  
  dom.addFeedModalClose?.addEventListener("click", hideAddFeedModal);
  dom.cancelFeedBtn?.addEventListener("click", hideAddFeedModal);
  dom.saveFeedBtn?.addEventListener("click", handleSaveFeed);
  
  dom.feedUrlInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dom.feedNameInput.focus();
  });
  dom.feedNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSaveFeed();
  });
  
  dom.addFeedModal?.addEventListener("click", (e) => {
    if (e.target === dom.addFeedModal) hideAddFeedModal();
  });
  
  renderCategoryFilter();
  renderRSS();
  
  const now = Date.now();
  const staleFeeds = state.feeds.filter(
    (f) => !f.lastFetched || now - f.lastFetched > CACHE_DURATION
  );
  
  if (staleFeeds.length > 0) {
    refreshAllFeeds();
  }
  
  if (!document.querySelector('#rss-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'rss-toast-styles';
    style.textContent = `
      .rss-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        max-width: 400px;
      }
      
      .rss-toast.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      .rss-toast-success {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      
      .rss-toast-error {
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      
      .rss-toast-info {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
      }
      
      .rss-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        gap: 16px;
      }
      
      .rss-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: rss-spin 0.8s linear infinite;
      }
      
      .rss-loader p {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
      }
      
      @keyframes rss-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRSSReader);
} else {
  initRSSReader();
}
