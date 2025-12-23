/**
 * Configuration Manager - Export/Import functionality
 * Handles backup and restore of startpage configuration
 */

/* =========================
   Constants
   ========================= */
const CONFIG_VERSION = "1.0";
const AUTO_BACKUP_KEY = "config_auto_backup";
const AUTO_BACKUP_INTERVAL_DAYS = 7;

/* =========================
   Export Functions
   ========================= */

/**
 * Export all configuration to a JSON file
 * @returns {Object} The exported configuration object
 */
export function exportConfig() {
  const config = {
    version: CONFIG_VERSION,
    exportDate: new Date().toISOString(),
    data: {
      favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
      theme: localStorage.getItem("theme") || "dark",
      faviconCache: JSON.parse(localStorage.getItem("favicons_cache") || "{}"),
    },
  };

  downloadJSON(config, `startpage-config-${getTimestamp()}.json`);
  return config;
}

/**
 * Download JSON data as a file
 * @param {Object} data - The data to download
 * @param {string} filename - The filename for the download
 */
export function downloadJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get formatted timestamp for filename
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

/* =========================
   Import Functions
   ========================= */

/**
 * Import configuration from a JSON file
 * @param {File} file - The JSON file to import
 * @returns {Promise<Object>} Promise resolving to imported config
 */
export function importConfig(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    if (!file.name.endsWith(".json")) {
      reject(new Error("File must be a JSON file"));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        validateConfig(config);
        applyConfig(config);
        resolve(config);
      } catch (error) {
        reject(new Error(`Invalid configuration file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate imported configuration structure
 * @param {Object} config - The configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("Configuration must be an object");
  }

  if (!config.version) {
    throw new Error("Missing configuration version");
  }

  if (!config.data || typeof config.data !== "object") {
    throw new Error("Missing or invalid data section");
  }
}

/**
 * Apply imported configuration to localStorage
 * @param {Object} config - The configuration to apply
 */
function applyConfig(config) {
  // Apply favorites
  if (config.data.favorites) {
    localStorage.setItem("favorites", JSON.stringify(config.data.favorites));
  }

  // Apply theme
  if (config.data.theme) {
    localStorage.setItem("theme", config.data.theme);
  }

  // Apply favicon cache (optional)
  if (config.data.faviconCache) {
    localStorage.setItem("favicons_cache", JSON.stringify(config.data.faviconCache));
  }

  // Trigger page reload to apply changes
  window.location.reload();
}

/* =========================
   Auto Backup Functions
   ========================= */

/**
 * Create automatic backup to localStorage
 */
export function autoBackup() {
  const config = {
    version: CONFIG_VERSION,
    backupDate: new Date().toISOString(),
    data: {
      favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
      theme: localStorage.getItem("theme") || "dark",
      faviconCache: JSON.parse(localStorage.getItem("favicons_cache") || "{}"),
    },
  };

  try {
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Failed to create auto backup:", e);
  }
}

/**
 * Check if auto backup is needed
 * @returns {boolean} True if backup is needed
 */
export function shouldAutoBackup() {
  const lastBackup = localStorage.getItem(AUTO_BACKUP_KEY);
  if (!lastBackup) return true;

  try {
    const backup = JSON.parse(lastBackup);
    const backupDate = new Date(backup.backupDate);
    const now = new Date();
    const daysSinceBackup = (now - backupDate) / (1000 * 60 * 60 * 24);
    
    return daysSinceBackup >= AUTO_BACKUP_INTERVAL_DAYS;
  } catch (e) {
    return true;
  }
}

/**
 * Restore from auto backup
 * @returns {boolean} True if restore was successful
 */
export function restoreFromAutoBackup() {
  const backup = localStorage.getItem(AUTO_BACKUP_KEY);
  if (!backup) return false;

  try {
    const config = JSON.parse(backup);
    applyConfig(config);
    return true;
  } catch (e) {
    console.warn("Failed to restore from auto backup:", e);
    return false;
  }
}

/* =========================
   Utility Functions
   ========================= */

/**
 * Get current configuration without exporting
 * @returns {Object} Current configuration object
 */
export function getCurrentConfig() {
  return {
    version: CONFIG_VERSION,
    exportDate: new Date().toISOString(),
    data: {
      favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
      theme: localStorage.getItem("theme") || "dark",
      faviconCache: JSON.parse(localStorage.getItem("favicons_cache") || "{}"),
    },
  };
}

/**
 * Clear all configuration data
 */
export function clearConfig() {
  localStorage.removeItem("favorites");
  localStorage.removeItem("theme");
  localStorage.removeItem("favicons_cache");
  localStorage.removeItem(AUTO_BACKUP_KEY);
}
