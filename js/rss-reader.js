/* =========================
   RSS Feed Reader Module
   ========================= */

const STORAGE_KEY = "rss_reader_data";
const CORS_PROXY = "https://api.allorigins.win/get?url=";
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
  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.contents;
  } catch (error) {
    console.error("Failed to fetch RSS feed:", error);
    throw error;
  }
}

function parseRSSXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  const items = [];
  const rssItems = xmlDoc.querySelectorAll("item");
  
  rssItems.forEach((item) => {
    const title = item.querySelector("title")?.textContent || "";
    const description = item.querySelector("description")?.textContent || "";
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    
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
    const parsedItems = parseRSSXML(xmlContent);
    
    // Update feed's last fetched time
    feed.lastFetched = Date.now();
    
    // Add new items
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
    
    // Keep only last 100 items per feed
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
  
  const results = [];
  
  for (const feed of state.feeds) {
    try {
      const count = await refreshFeed(feed);
      results.push({ feed, count, error: null });
    } catch (error) {
      results.push({ feed, count: 0, error });
    }
  }
  
  state.isRefreshing = false;
  updateRefreshButton();
  
  renderRSS();
  
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
  
  // Otherwise show date
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
  
  // Mark as read when clicked
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
  
  // Filter by category
  if (state.activeCategory !== "all") {
    const categoryFeedIds = state.feeds
      .filter((f) => f.category === state.activeCategory)
      .map((f) => f.id);
    filteredItems = filteredItems.filter((i) => categoryFeedIds.includes(i.feedId));
  }
  
  // Sort by date (newest first)
  filteredItems.sort((a, b) => b.pubDate - a.pubDate);
  
  // Show only last 50 items
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

function addFeed(url, name, category) {
  if (!url || !name) {
    alert("Please provide both URL and name for the feed.");
    return false;
  }
  
  // Check for duplicate URLs
  if (state.feeds.some((f) => f.url === url)) {
    alert("This feed URL is already added.");
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
  
  // Refresh the new feed
  refreshFeed(feed).then(() => {
    renderCategoryFilter();
    renderRSS();
  }).catch((error) => {
    console.error("Failed to fetch initial feed data:", error);
    alert("Failed to fetch feed data. The feed has been added but may not work correctly.");
  });
  
  return true;
}

function deleteFeed(feedId) {
  if (!confirm("Are you sure you want to delete this feed?")) return;
  
  state.feeds = state.feeds.filter((f) => f.id !== feedId);
  state.items = state.items.filter((i) => i.feedId !== feedId);
  
  saveData();
  renderCategoryFilter();
  renderRSS();
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
  // Find DOM elements
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
  
  // Load data
  loadData();
  
  // Set up event listeners
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
  
  // Close modal on backdrop click
  dom.addFeedModal?.addEventListener("click", (e) => {
    if (e.target === dom.addFeedModal) hideAddFeedModal();
  });
  
  // Initial render
  renderCategoryFilter();
  renderRSS();
  
  // Auto-refresh feeds on load if they're stale
  const now = Date.now();
  const staleFeeds = state.feeds.filter(
    (f) => !f.lastFetched || now - f.lastFetched > CACHE_DURATION
  );
  
  if (staleFeeds.length > 0) {
    refreshAllFeeds();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRSSReader);
} else {
  initRSSReader();
}
