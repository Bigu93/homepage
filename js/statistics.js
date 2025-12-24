/* =========================
   Statistics Module
   Tracks usage patterns and displays statistics
   ========================= */

const STORAGE_KEY = "startpage_statistics";
const MAX_SESSIONS = 100; // Keep only last 100 sessions
const MAX_LINKS_DISPLAY = 10; // Show top 10 most visited links

/**
 * Statistics data structure:
 * {
 *   linkClicks: { linkId: count },
 *   categoryClicks: { categoryName: count },
 *   sessions: [{ startTime, endTime, duration }],
 *   totalVisits: number,
 *   lastVisit: timestamp
 * }
 */

// Default statistics object
const defaultStats = {
  linkClicks: {},
  categoryClicks: {},
  sessions: [],
  totalVisits: 0,
  lastVisit: null,
  currentSessionStart: null,
};

/**
 * Get statistics from localStorage
 */
function getStatistics() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultStats, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn("Failed to parse statistics:", e);
  }
  return { ...defaultStats };
}

/**
 * Save statistics to localStorage
 */
function saveStatistics(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Failed to save statistics:", e);
  }
}

/**
 * Initialize a new session on page load
 */
function initSession() {
  const stats = getStatistics();
  stats.totalVisits++;
  stats.lastVisit = Date.now();
  stats.currentSessionStart = Date.now();
  saveStatistics(stats);
}

/**
 * End current session (on page unload)
 */
function endSession() {
  const stats = getStatistics();
  if (stats.currentSessionStart) {
    const endTime = Date.now();
    const duration = endTime - stats.currentSessionStart;

    if (duration > 1000) {
      stats.sessions.push({
        startTime: stats.currentSessionStart,
        endTime: endTime,
        duration: duration,
      });

      if (stats.sessions.length > MAX_SESSIONS) {
        stats.sessions = stats.sessions.slice(-MAX_SESSIONS);
      }
    }

    stats.currentSessionStart = null;
    saveStatistics(stats);
  }
}

/**
 * Track a link click
 */
function trackLinkClick(linkId, linkName, category) {
  const stats = getStatistics();

  if (!stats.linkClicks[linkId]) {
    stats.linkClicks[linkId] = { count: 0, name: linkName, category: category };
  }
  stats.linkClicks[linkId].count++;

  if (!stats.categoryClicks[category]) {
    stats.categoryClicks[category] = 0;
  }
  stats.categoryClicks[category]++;

  saveStatistics(stats);
}

/**
 * Get most visited links
 */
function getMostVisitedLinks(limit = MAX_LINKS_DISPLAY) {
  const stats = getStatistics();
  const links = Object.entries(stats.linkClicks)
    .map(([url, data]) => ({ url, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return links;
}

/**
 * Get category usage distribution
 */
function getCategoryUsage() {
  const stats = getStatistics();
  const total = Object.values(stats.categoryClicks).reduce((sum, count) => sum + count, 0);

  return Object.entries(stats.categoryClicks)
    .map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get session statistics
 */
function getSessionStats() {
  const stats = getStatistics();
  const sessions = stats.sessions;

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalDuration: 0,
      averageDuration: 0,
      recentSessions: [],
    };
  }

  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const averageDuration = totalDuration / sessions.length;

  return {
    totalSessions: sessions.length,
    totalDuration: totalDuration,
    averageDuration: averageDuration,
    recentSessions: sessions.slice(-10).reverse(), // Last 10 sessions
  };
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format date for display
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get weekly report (simplified)
 */
function getWeeklyReport() {
  const stats = getStatistics();
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const weeklySessions = stats.sessions.filter((s) => s.startTime >= weekAgo);
  const weeklyDuration = weeklySessions.reduce((sum, s) => sum + s.duration, 0);

  // Count link clicks in the past week (simplified - using total since we don't track timestamps per click)
  const totalLinkClicks = Object.values(stats.linkClicks).reduce(
    (sum, data) => sum + data.count,
    0
  );

  return {
    sessions: weeklySessions.length,
    duration: weeklyDuration,
    linkClicks: totalLinkClicks,
  };
}

/**
 * Get monthly report (simplified)
 */
function getMonthlyReport() {
  const stats = getStatistics();
  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const monthlySessions = stats.sessions.filter((s) => s.startTime >= monthAgo);
  const monthlyDuration = monthlySessions.reduce((sum, s) => sum + s.duration, 0);

  return {
    sessions: monthlySessions.length,
    duration: monthlyDuration,
  };
}

/**
 * Reset all statistics
 */
function resetStatistics() {
  if (confirm("Are you sure you want to reset all statistics? This cannot be undone.")) {
    const resetStats = {
      ...defaultStats,
      currentSessionStart: Date.now(),
      totalVisits: 1,
      lastVisit: Date.now(),
    };
    saveStatistics(resetStats);
    renderStatistics();
    showToast("Statistics reset successfully");
  }
}

/**
 * Render statistics panel
 */
function renderStatistics() {
  const stats = getStatistics();
  const sessionStats = getSessionStats();
  const categoryUsage = getCategoryUsage();
  const mostVisited = getMostVisitedLinks();
  const weeklyReport = getWeeklyReport();
  const monthlyReport = getMonthlyReport();

  const container = document.getElementById("statistics-content");
  if (!container) return;

  container.innerHTML = `
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">${stats.totalVisits}</div>
        <div class="stat-label">Total Visits</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${sessionStats.totalSessions}</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatDuration(sessionStats.averageDuration)}</div>
        <div class="stat-label">Avg Session</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatDuration(sessionStats.totalDuration)}</div>
        <div class="stat-label">Total Time</div>
      </div>
    </div>

    <div class="stats-section">
      <h3 class="stats-section-title">Most Visited Links</h3>
      ${mostVisited.length > 0 ? renderMostVisited(mostVisited) : '<div class="stats-empty">No link data yet</div>'}
    </div>

    <div class="stats-section">
      <h3 class="stats-section-title">Category Usage</h3>
      ${categoryUsage.length > 0 ? renderCategoryBars(categoryUsage) : '<div class="stats-empty">No category data yet</div>'}
    </div>

    <div class="stats-section">
      <h3 class="stats-section-title">Recent Sessions</h3>
      ${sessionStats.recentSessions.length > 0 ? renderRecentSessions(sessionStats.recentSessions) : '<div class="stats-empty">No session data yet</div>'}
    </div>

    <div class="stats-section">
      <h3 class="stats-section-title">Reports</h3>
      <div class="reports-grid">
        <div class="report-card">
          <div class="report-label">This Week</div>
          <div class="report-value">${weeklyReport.sessions} sessions</div>
          <div class="report-sub">${formatDuration(weeklyReport.duration)} total</div>
        </div>
        <div class="report-card">
          <div class="report-label">This Month</div>
          <div class="report-value">${monthlyReport.sessions} sessions</div>
          <div class="report-sub">${formatDuration(monthlyReport.duration)} total</div>
        </div>
      </div>
    </div>

    <div class="stats-footer">
      <button id="reset-stats-btn" class="btn-danger">Reset Statistics</button>
    </div>
  `;

  document.getElementById("reset-stats-btn")?.addEventListener("click", resetStatistics);
}

/**
 * Render most visited links list
 */
function renderMostVisited(links) {
  return `
    <div class="most-visited-list">
      ${links
        .map(
          (link, index) => `
        <div class="most-visited-item">
          <span class="visit-rank">${index + 1}</span>
          <span class="visit-name">${escapeHtml(link.name)}</span>
          <span class="visit-count">${link.count} clicks</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * Render category usage as progress bars
 */
function renderCategoryBars(categories) {
  const maxCount = categories[0]?.count || 1;

  return `
    <div class="category-bars">
      ${categories
        .map(
          (cat) => `
        <div class="category-bar-item">
          <div class="category-bar-header">
            <span class="category-name">${escapeHtml(cat.category)}</span>
            <span class="category-count">${cat.count} (${cat.percentage.toFixed(1)}%)</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width: ${(cat.count / maxCount) * 100}%"></div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * Render recent sessions
 */
function renderRecentSessions(sessions) {
  return `
    <div class="sessions-list">
      ${sessions
        .map(
          (session) => `
        <div class="session-item">
          <span class="session-date">${formatDate(session.startTime)}</span>
          <span class="session-duration">${formatDuration(session.duration)}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message) {
  const existing = document.querySelector(".stats-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "stats-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Toggle statistics panel
 */
function toggleStatisticsPanel() {
  const panel = document.getElementById("statistics-panel");
  const toggleBtn = document.getElementById("stats-toggle-btn");

  if (!panel || !toggleBtn) return;

  const isVisible = panel.classList.contains("visible");

  if (isVisible) {
    panel.classList.remove("visible");
    toggleBtn.classList.remove("active");
  } else {
    panel.classList.add("visible");
    toggleBtn.classList.add("active");
    renderStatistics();
  }
}

/**
 * Initialize statistics module
 */
function initStatistics() {
  initSession();

  document.addEventListener("click", (e) => {
    const linkCard = e.target.closest(".link-card");
    if (linkCard && linkCard.href) {
      const name = linkCard.dataset.name || linkCard.textContent.trim();
      const category = linkCard.dataset.category || "Unknown";
      trackLinkClick(linkCard.href, name, category);
    }
  });

  window.addEventListener("beforeunload", endSession);

  const toggleBtn = document.getElementById("stats-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleStatisticsPanel);
  }

  const closeBtn = document.getElementById("stats-panel-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", toggleStatisticsPanel);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStatistics);
} else {
  initStatistics();
}

export {
  getStatistics,
  trackLinkClick,
  getMostVisitedLinks,
  getCategoryUsage,
  getSessionStats,
  resetStatistics,
  renderStatistics,
};
