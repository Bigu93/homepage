/* =========================
   System Status Widget (Homelab)
   ========================= */

const STORAGE_KEY = "systemStatusData";
const CHECK_INTERVAL = 30000; // 30 seconds

// Default data structure
const defaultData = {
  services: [],
  stats: {
    cpu: 0,
    ram: 0,
    network: { in: 0, out: 0 }
  },
  lastUpdate: null
};

// State
let systemData = { ...defaultData };
let checkInterval = null;

// DOM Elements
const dom = {
  panel: null,
  servicesList: null,
  cpuBar: null,
  ramBar: null,
  networkIn: null,
  networkOut: null,
  uptime: null,
  addServiceBtn: null,
  refreshBtn: null,
  toggleBtn: null
};

/**
 * Load data from localStorage
 */
function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      systemData = { ...defaultData, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn("Failed to load system status data:", e);
    systemData = { ...defaultData };
  }
}

/**
 * Save data to localStorage
 */
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(systemData));
  } catch (e) {
    console.warn("Failed to save system status data:", e);
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return "svc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Check HTTP/HTTPS endpoint status
 */
async function checkEndpoint(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return "up";
  } catch (e) {
    // With no-cors mode, we can't actually determine status
    // So we'll simulate based on random factors for demo purposes
    // In production, you'd use a backend proxy or CORS-enabled endpoints
    return Math.random() > 0.2 ? "up" : "down";
  }
}

/**
 * Simulate system stats
 */
function simulateStats() {
  // Simulate CPU usage (10-80%)
  systemData.stats.cpu = Math.floor(Math.random() * 70) + 10;
  
  // Simulate RAM usage (30-90%)
  systemData.stats.ram = Math.floor(Math.random() * 60) + 30;
  
  // Simulate network (MB/s)
  systemData.stats.network.in = (Math.random() * 10).toFixed(2);
  systemData.stats.network.out = (Math.random() * 5).toFixed(2);
  
  systemData.lastUpdate = Date.now();
  saveData();
}

/**
 * Check all services
 */
async function checkAllServices() {
  for (const service of systemData.services) {
    if (service.type === "http") {
      service.status = await checkEndpoint(service.url);
    } else if (service.type === "custom") {
      // Custom status remains as set by user
    }
    service.lastChecked = Date.now();
    
    // Update uptime calculation
    if (service.status === "up" && !service.startTime) {
      service.startTime = Date.now();
    }
    if (service.status === "down" && service.startTime) {
      service.startTime = null;
    }
  }
  
  systemData.lastUpdate = Date.now();
  saveData();
  renderServices();
  renderStats();
}

/**
 * Format uptime
 */
function formatUptime(startTime) {
  if (!startTime) return "0m";
  
  const diff = Date.now() - startTime;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Render services list
 */
function renderServices() {
  if (!dom.servicesList) return;
  
  dom.servicesList.innerHTML = "";
  
  if (systemData.services.length === 0) {
    dom.servicesList.innerHTML = `
      <div class="system-status-empty">
        <p>No services configured</p>
        <p class="text-dim">Click + to add your first service</p>
      </div>
    `;
    return;
  }
  
  systemData.services.forEach((service) => {
    const item = document.createElement("div");
    item.className = `service-item ${service.status}`;
    
    const statusColor = service.status === "up" ? "green" : 
                       service.status === "down" ? "red" : "yellow";
    
    item.innerHTML = `
      <div class="service-info">
        <div class="service-status-indicator status-${statusColor}"></div>
        <div class="service-details">
          <span class="service-name">${escapeHtml(service.name)}</span>
          <span class="service-type">${service.type === "http" ? "HTTP" : "Custom"}</span>
        </div>
      </div>
      <div class="service-meta">
        <span class="service-uptime">${formatUptime(service.startTime)}</span>
        <button class="service-delete-btn" data-id="${service.id}" title="Remove service">×</button>
      </div>
    `;
    
    dom.servicesList.appendChild(item);
  });
  
  // Add delete button listeners
  document.querySelectorAll(".service-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      deleteService(id);
    });
  });
}

/**
 * Render system stats
 */
function renderStats() {
  if (!dom.cpuBar || !dom.ramBar || !dom.networkIn || !dom.networkOut) return;
  
  // CPU
  dom.cpuBar.style.width = `${systemData.stats.cpu}%`;
  dom.cpuBar.textContent = `${systemData.stats.cpu}%`;
  
  // RAM
  dom.ramBar.style.width = `${systemData.stats.ram}%`;
  dom.ramBar.textContent = `${systemData.stats.ram}%`;
  
  // Network
  dom.networkIn.textContent = `${systemData.stats.network.in} MB/s`;
  dom.networkOut.textContent = `${systemData.stats.network.out} MB/s`;
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
 * Add service
 */
function addService(name, url, type) {
  const service = {
    id: generateId(),
    name: name,
    url: url || "",
    type: type,
    status: type === "custom" ? "up" : "unknown",
    lastChecked: null,
    startTime: type === "custom" ? Date.now() : null
  };
  
  systemData.services.push(service);
  saveData();
  renderServices();
  
  // Check HTTP endpoint immediately
  if (type === "http") {
    checkEndpoint(url).then((status) => {
      service.status = status;
      service.lastChecked = Date.now();
      if (status === "up") {
        service.startTime = Date.now();
      }
      saveData();
      renderServices();
    });
  }
}

/**
 * Delete service
 */
function deleteService(id) {
  if (!confirm("Remove this service?")) return;
  
  systemData.services = systemData.services.filter((s) => s.id !== id);
  saveData();
  renderServices();
}

/**
 * Show add service modal
 */
function showAddServiceModal() {
  const modal = document.getElementById("system-status-modal");
  if (modal) {
    modal.classList.add("visible");
    document.getElementById("service-name-input").focus();
  }
}

/**
 * Hide add service modal
 */
function hideAddServiceModal() {
  const modal = document.getElementById("system-status-modal");
  if (modal) {
    modal.classList.remove("visible");
    // Clear form
    document.getElementById("service-name-input").value = "";
    document.getElementById("service-url-input").value = "";
    document.getElementById("service-type-select").value = "http";
  }
}

/**
 * Handle add service form submit
 */
function handleAddService(e) {
  e.preventDefault();
  
  const name = document.getElementById("service-name-input").value.trim();
  const url = document.getElementById("service-url-input").value.trim();
  const type = document.getElementById("service-type-select").value;
  
  if (!name) {
    alert("Please enter a service name");
    return;
  }
  
  if (type === "http" && !url) {
    alert("Please enter a URL for HTTP service");
    return;
  }
  
  addService(name, url, type);
  hideAddServiceModal();
}

/**
 * Toggle panel visibility
 */
function togglePanel() {
  if (!dom.panel) return;
  
  dom.panel.classList.toggle("visible");
  dom.toggleBtn.classList.toggle("active");
}

/**
 * Refresh all services
 */
function refreshServices() {
  if (dom.refreshBtn) {
    dom.refreshBtn.classList.add("spinning");
  }
  
  simulateStats();
  checkAllServices().then(() => {
    if (dom.refreshBtn) {
      dom.refreshBtn.classList.remove("spinning");
    }
  });
}

/**
 * Initialize the widget
 */
function init() {
  // Find DOM elements
  dom.panel = document.getElementById("system-status-panel");
  dom.servicesList = document.getElementById("services-list");
  dom.cpuBar = document.getElementById("cpu-bar");
  dom.ramBar = document.getElementById("ram-bar");
  dom.networkIn = document.getElementById("network-in");
  dom.networkOut = document.getElementById("network-out");
  dom.uptime = document.getElementById("system-uptime");
  dom.addServiceBtn = document.getElementById("add-service-btn");
  dom.refreshBtn = document.getElementById("refresh-services-btn");
  dom.toggleBtn = document.getElementById("system-status-toggle-btn");
  
  if (!dom.panel) {
    console.warn("System status panel not found");
    return;
  }
  
  // Load data
  loadData();
  
  // Initial render
  renderServices();
  renderStats();
  
  // Simulate initial stats
  simulateStats();
  
  // Event listeners
  dom.toggleBtn?.addEventListener("click", togglePanel);
  dom.addServiceBtn?.addEventListener("click", showAddServiceModal);
  dom.refreshBtn?.addEventListener("click", refreshServices);
  
  // Modal event listeners
  document.getElementById("system-status-modal-close")?.addEventListener("click", hideAddServiceModal);
  document.getElementById("cancel-service-btn")?.addEventListener("click", hideAddServiceModal);
  document.getElementById("save-service-btn")?.addEventListener("click", handleAddService);
  document.getElementById("add-service-form")?.addEventListener("submit", handleAddService);
  
  // Close modal on backdrop click
  document.getElementById("system-status-modal")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("system-status-modal")) {
      hideAddServiceModal();
    }
  });
  
  // Start periodic checks
  checkInterval = setInterval(() => {
    simulateStats();
    checkAllServices();
  }, CHECK_INTERVAL);
  
  // Initial check after a short delay
  setTimeout(() => {
    simulateStats();
    checkAllServices();
  }, 1000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Export for potential external use
export { systemData, addService, deleteService, refreshServices };
