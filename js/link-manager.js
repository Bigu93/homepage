/* =========================
   Link Manager Module
   Allows users to manage shortcuts from UI
   ========================= */

const STORAGE_KEY = "custom_shortcuts";

/* =========================
   State & DOM
   ========================= */
let customData = loadCustomData();

const dom = {
  viewContainer: document.getElementById("view-container"),
  sidebarCats: document.getElementById("sidebar-categories"),
};

/* =========================
   Data Management
   ========================= */

/**
 * Load custom shortcuts from localStorage
 * @returns {Array} - Custom data array
 */
function loadCustomData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to load custom data:", e);
    return [];
  }
}

/**
 * Save custom shortcuts to localStorage
 */
function saveCustomData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customData));
  } catch (e) {
    console.warn("Failed to save custom data:", e);
  }
}

/**
 * Get all data (default + custom)
 * @returns {Array} - Combined data array
 */
function getAllData() {
  return window.defaultShortcuts ? [...window.defaultShortcuts, ...customData] : customData;
}

/**
 * Find category by name in all data
 * @param {string} categoryName - Category name
 * @returns {Object|null} - Category object or null
 */
function findCategory(categoryName) {
  const allData = getAllData();
  return allData.find((cat) => cat.category === categoryName);
}

/**
 * Find category by name in custom data only
 * @param {string} categoryName - Category name
 * @returns {Object|null} - Category object or null
 */
function findCustomCategory(categoryName) {
  return customData.find((cat) => cat.category === categoryName);
}

/**
 * Add new category
 * @param {string} name - Category name
 * @param {string} color - Category color
 * @param {string} icon - Category icon
 */
function addCategory(name, color, icon) {
  if (!name || findCategory(name)) {
    return false;
  }
  customData.push({
    category: name,
    color: color || "cyan",
    items: {},
    icon: icon || "default",
  });
  saveCustomData();
  return true;
}

/**
 * Rename category (only custom categories)
 * @param {string} oldName - Current category name
 * @param {string} newName - New category name
 */
function renameCategory(oldName, newName) {
  const cat = findCustomCategory(oldName);
  if (!cat || !newName) return false;
  cat.category = newName;
  saveCustomData();
  return true;
}

/**
 * Delete category (only custom categories)
 * @param {string} categoryName - Category name to delete
 */
function deleteCategory(categoryName) {
  const index = customData.findIndex((cat) => cat.category === categoryName);
  if (index === -1) return false;
  customData.splice(index, 1);
  saveCustomData();
  return true;
}

/**
 * Add link to category (works for all categories)
 * @param {string} categoryName - Category name
 * @param {string} linkName - Link name
 * @param {string} linkUrl - Link URL
 */
function addLink(categoryName, linkName, linkUrl) {
  const cat = findCategory(categoryName);
  const customCat = findCustomCategory(categoryName);
  
  if (!cat || !linkName || !linkUrl) return false;
  
  if (customCat) {
    customCat.items[linkName] = linkUrl;
    saveCustomData();
  } else {
    let overrideCat = findCustomCategory(categoryName);
    if (!overrideCat) {
      overrideCat = {
        category: categoryName,
        color: cat.color,
        items: { ...cat.items },
        icon: cat.icon,
      };
      customData.push(overrideCat);
    }
    overrideCat.items[linkName] = linkUrl;
    saveCustomData();
  }
  return true;
}

/**
 * Edit link (works for all categories)
 * @param {string} categoryName - Category name
 * @param {string} oldLinkName - Current link name
 * @param {string} newLinkName - New link name
 * @param {string} newLinkUrl - New link URL
 */
function editLink(categoryName, oldLinkName, newLinkName, newLinkUrl) {
  const cat = findCategory(categoryName);
  const customCat = findCustomCategory(categoryName);
  
  if (!cat) return false;
  
  if (customCat) {
    if (oldLinkName !== newLinkName) {
      delete customCat.items[oldLinkName];
    }
    customCat.items[newLinkName] = newLinkUrl;
    saveCustomData();
  } else {
    let overrideCat = findCustomCategory(categoryName);
    if (!overrideCat) {
      overrideCat = {
        category: categoryName,
        color: cat.color,
        items: { ...cat.items },
        icon: cat.icon,
      };
      customData.push(overrideCat);
    }
    if (oldLinkName !== newLinkName) {
      delete overrideCat.items[oldLinkName];
    }
    overrideCat.items[newLinkName] = newLinkUrl;
    saveCustomData();
  }
  return true;
}

/**
 * Delete link (works for all categories)
 * @param {string} categoryName - Category name
 * @param {string} linkName - Link name to delete
 */
function deleteLink(categoryName, linkName) {
  const cat = findCategory(categoryName);
  const customCat = findCustomCategory(categoryName);
  
  if (!cat || !cat.items[linkName]) return false;
  
  if (customCat) {
    delete customCat.items[linkName];
    saveCustomData();
  } else {
    let overrideCat = findCustomCategory(categoryName);
    if (!overrideCat) {
      overrideCat = {
        category: categoryName,
        color: cat.color,
        items: { ...cat.items },
        icon: cat.icon,
      };
      customData.push(overrideCat);
    }
    delete overrideCat.items[linkName];
    saveCustomData();
  }
  return true;
}

/* =========================
   UI Components
   ========================= */

/**
 * Create link edit modal
 */
function createLinkModal() {
  const modal = document.createElement("div");
  modal.className = "link-modal";
  modal.id = "link-modal";
  modal.innerHTML = `
    <div class="link-modal-content">
      <div class="link-modal-header">
        <h3>Manage Link</h3>
        <button class="link-modal-close" title="Close">×</button>
      </div>
      <div class="link-modal-body">
        <form id="link-form">
          <input type="hidden" id="link-category-name" />
          <input type="hidden" id="link-old-name" />
          
          <div class="form-group">
            <label for="link-name">Link Name</label>
            <input type="text" id="link-name" placeholder="e.g., My Website" required />
          </div>
          
          <div class="form-group">
            <label for="link-url">URL</label>
            <input type="url" id="link-url" placeholder="https://example.com" required />
          </div>
          
          <div class="form-group">
            <label for="link-category">Category</label>
            <select id="link-category" required></select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-primary">Save Link</button>
          </div>
        </form>
      </div>
    </div>
  `;
  return modal;
}

/**
 * Create category management modal
 */
function createCategoryModal() {
  const modal = document.createElement("div");
  modal.className = "link-modal";
  modal.id = "category-modal";
  modal.innerHTML = `
    <div class="link-modal-content">
      <div class="link-modal-header">
        <h3>Manage Category</h3>
        <button class="link-modal-close" title="Close">×</button>
      </div>
      <div class="link-modal-body">
        <form id="category-form">
          <input type="hidden" id="category-old-name" />
          
          <div class="form-group">
            <label for="category-name">Category Name</label>
            <input type="text" id="category-name" placeholder="e.g., My Links" required />
          </div>
          
          <div class="form-group">
            <label for="category-color">Color</label>
            <select id="category-color">
              <option value="yellow">Yellow</option>
              <option value="cyan">Cyan</option>
              <option value="blue">Blue</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
              <option value="light-gray">Light Gray</option>
              <option value="gray">Gray</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="category-icon">Icon</label>
            <select id="category-icon">
              <option value="default">Default</option>
              <option value="home">Home</option>
              <option value="code">Code</option>
              <option value="graduation-cap">Graduation Cap</option>
              <option value="cpu">CPU</option>
              <option value="terminal">Terminal</option>
              <option value="briefcase">Briefcase</option>
              <option value="gamepad-2">Gamepad</option>
              <option value="newspaper">Newspaper</option>
              <option value="shopping-cart">Shopping Cart</option>
              <option value="joystick">Joystick</option>
              <option value="star">Star</option>
              <option value="server">Server</option>
              <option value="flag">Flag</option>
              <option value="shield">Shield</option>
              <option value="activity">Activity</option>
              <option value="book">Book</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-primary">Save Category</button>
          </div>
        </form>
      </div>
    </div>
  `;
  return modal;
}

/**
 * Create delete confirmation dialog
 */
function createConfirmDialog(message, onConfirm) {
  const dialog = document.createElement("div");
  dialog.className = "link-modal";
  dialog.id = "confirm-dialog";
  dialog.innerHTML = `
    <div class="link-modal-content link-modal-small">
      <div class="link-modal-header">
        <h3>Confirm</h3>
        <button class="link-modal-close" title="Close">×</button>
      </div>
      <div class="link-modal-body">
        <p class="confirm-message">${message}</p>
        <div class="form-actions">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="button" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  `;

  dialog.querySelector(".btn-danger").onclick = () => {
    onConfirm();
    closeConfirmDialog();
  };

  dialog.querySelector(".btn-cancel").onclick = closeConfirmDialog;
  dialog.querySelector(".link-modal-close").onclick = closeConfirmDialog;

  document.body.appendChild(dialog);
  setTimeout(() => dialog.classList.add("visible"), 10);
}

function closeConfirmDialog() {
  const dialog = document.getElementById("confirm-dialog");
  if (dialog) {
    dialog.classList.remove("visible");
    setTimeout(() => dialog.remove(), 300);
  }
}

/**
 * Create context menu
 */
function createContextMenu() {
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.id = "context-menu";
  menu.innerHTML = `
    <button class="context-menu-item" data-action="edit">
      <span class="context-icon">✎</span> Edit
    </button>
    <button class="context-menu-item" data-action="delete">
      <span class="context-icon">🗑</span> Delete
    </button>
  `;
  return menu;
}

/* =========================
   Modal Functions
   ========================= */

/**
 * Open link modal for adding/editing
 * @param {string} categoryName - Category name
 * @param {string} linkName - Link name (for editing)
 * @param {string} linkUrl - Link URL (for editing)
 */
function openLinkModal(categoryName = "", linkName = "", linkUrl = "") {
  let modal = document.getElementById("link-modal");
  if (!modal) {
    modal = createLinkModal();
    document.body.appendChild(modal);
    setupLinkModalEvents();
  }

  const form = modal.querySelector("#link-form");
  const catSelect = modal.querySelector("#link-category");
  
  catSelect.innerHTML = "";
  const allData = getAllData();
  allData.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.category;
    option.textContent = cat.category;
    catSelect.appendChild(option);
  });

  modal.querySelector("#link-category-name").value = categoryName;
  modal.querySelector("#link-old-name").value = linkName;
  modal.querySelector("#link-name").value = linkName;
  modal.querySelector("#link-url").value = linkUrl;
  catSelect.value = categoryName || "";

  modal.querySelector("h3").textContent = linkName ? "Edit Link" : "Add Link";
  modal.querySelector("#link-name").focus();

  modal.classList.add("visible");
}

/**
 * Open category modal for adding/editing
 * @param {string} categoryName - Category name (for editing)
 */
function openCategoryModal(categoryName = "") {
  let modal = document.getElementById("category-modal");
  if (!modal) {
    modal = createCategoryModal();
    document.body.appendChild(modal);
    setupCategoryModalEvents();
  }

  const cat = findCategory(categoryName);
  
  modal.querySelector("#category-old-name").value = categoryName;
  modal.querySelector("#category-name").value = categoryName;
  modal.querySelector("#category-color").value = cat?.color || "cyan";
  modal.querySelector("#category-icon").value = cat?.icon || "default";

  modal.querySelector("h3").textContent = categoryName ? "Edit Category" : "Add Category";
  modal.querySelector("#category-name").focus();

  modal.classList.add("visible");
}

/**
 * Close all modals
 */
function closeModals() {
  document.querySelectorAll(".link-modal.visible").forEach((modal) => {
    modal.classList.remove("visible");
  });
}

/* =========================
   Event Handlers
   ========================= */

function setupLinkModalEvents() {
  const modal = document.getElementById("link-modal");
  const form = modal.querySelector("#link-form");

  modal.querySelector(".link-modal-close").onclick = closeModals;
  modal.querySelector(".btn-cancel").onclick = closeModals;

  form.onsubmit = (e) => {
    e.preventDefault();
    const categoryName = modal.querySelector("#link-category").value;
    const oldName = modal.querySelector("#link-old-name").value;
    const newName = modal.querySelector("#link-name").value.trim();
    const newUrl = modal.querySelector("#link-url").value.trim();

    if (oldName) {
      if (editLink(categoryName, oldName, newName, newUrl)) {
        refreshDashboard();
        closeModals();
      }
    } else {
      if (addLink(categoryName, newName, newUrl)) {
        refreshDashboard();
        closeModals();
      }
    }
  };

  modal.onkeydown = (e) => {
    if (e.key === "Escape") closeModals();
  };
}

function setupCategoryModalEvents() {
  const modal = document.getElementById("category-modal");
  const form = modal.querySelector("#category-form");

  modal.querySelector(".link-modal-close").onclick = closeModals;
  modal.querySelector(".btn-cancel").onclick = closeModals;

  form.onsubmit = (e) => {
    e.preventDefault();
    const oldName = modal.querySelector("#category-old-name").value;
    const newName = modal.querySelector("#category-name").value.trim();
    const color = modal.querySelector("#category-color").value;
    const icon = modal.querySelector("#category-icon").value;

    if (oldName) {
      if (renameCategory(oldName, newName)) {
        refreshDashboard();
        closeModals();
      }
    } else {
      if (addCategory(newName, color, icon)) {
        refreshDashboard();
        closeModals();
      }
    }
  };

  modal.onkeydown = (e) => {
    if (e.key === "Escape") closeModals();
  };
}

function setupContextMenu() {
  let menu = document.getElementById("context-menu");
  if (!menu) {
    menu = createContextMenu();
    document.body.appendChild(menu);
  }

  let currentTarget = null;

  document.addEventListener("contextmenu", (e) => {
    const linkCard = e.target.closest(".link-card");
    if (linkCard) {
      e.preventDefault();
      currentTarget = linkCard;
      
      const categoryName = linkCard.dataset.category;
      const linkName = linkCard.dataset.name;
      
      let left = e.clientX;
      let top = e.clientY;
      const menuRect = menu.getBoundingClientRect();
      
      if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 10;
      }
      if (top + menuRect.height > window.innerHeight) {
        top = window.innerHeight - menuRect.height - 10;
      }
      
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      menu.classList.add("visible");
      
      menu.dataset.category = categoryName;
      menu.dataset.linkName = linkName;
    }
  });

  menu.querySelectorAll(".context-menu-item").forEach((item) => {
    item.onclick = () => {
      const action = item.dataset.action;
      const categoryName = menu.dataset.category;
      const linkName = menu.dataset.linkName;
      
      if (action === "edit") {
        const cat = findCategory(categoryName);
        if (cat && cat.items[linkName]) {
          openLinkModal(categoryName, linkName, cat.items[linkName]);
        }
      } else if (action === "delete") {
        const customCat = findCustomCategory(categoryName);
        const message = customCat
          ? `Are you sure you want to delete "${linkName}" from "${categoryName}"?`
          : `Are you sure you want to hide "${linkName}" from "${categoryName}"? (This will create a custom override)`;
        
        createConfirmDialog(message, () => {
          if (deleteLink(categoryName, linkName)) {
            refreshDashboard();
          }
        });
      }
      
      menu.classList.remove("visible");
    };
  });

  document.addEventListener("click", () => {
    menu.classList.remove("visible");
  });
}

/**
 * Add "Add Link" buttons to category headers
 */
function addLinkButtons() {
  const categoryHeaders = document.querySelectorAll(".category-header");
  categoryHeaders.forEach((header) => {
    const categoryName = header.textContent.trim();
    const cat = findCategory(categoryName);
    
    if (cat) {
      const existingBtn = header.querySelector(".add-link-btn");
      if (existingBtn) existingBtn.remove();
      
      const addBtn = document.createElement("button");
      addBtn.className = "add-link-btn";
      addBtn.innerHTML = "+";
      addBtn.title = "Add link to this category";
      addBtn.onclick = () => openLinkModal(categoryName);
      header.appendChild(addBtn);
    }
  });
}

/**
 * Add category management button to sidebar
 */
function addCategoryManagementButton() {
  const sidebarNav = document.querySelector(".sidebar-nav");
  if (!sidebarNav) return;

  if (sidebarNav.querySelector("#add-category-btn")) return;

  const divider = document.createElement("div");
  divider.className = "nav-divider";

  const addBtn = document.createElement("button");
  addBtn.id = "add-category-btn";
  addBtn.className = "nav-item";
  addBtn.innerHTML = `<span class="icon">+</span><span class="label">Add Category</span>`;
  addBtn.onclick = () => openCategoryModal();

  const manageBtn = document.createElement("button");
  manageBtn.id = "manage-categories-btn";
  manageBtn.className = "nav-item";
  manageBtn.innerHTML = `<span class="icon">⚙</span><span class="label">Manage Categories</span>`;
  manageBtn.onclick = () => openCategoryManagementPanel();

  sidebarNav.appendChild(divider);
  sidebarNav.appendChild(addBtn);
  sidebarNav.appendChild(manageBtn);
}

/**
 * Open category management panel
 */
function openCategoryManagementPanel() {
  const modal = document.createElement("div");
  modal.className = "link-modal";
  modal.id = "manage-categories-modal";
  
  let categoriesHtml = "";
  customData.forEach((cat) => {
    categoriesHtml += `
      <div class="category-manage-item" data-category="${cat.category}">
        <span class="category-name">${cat.category}</span>
        <div class="category-actions">
          <button class="category-action-btn edit-cat" title="Edit">✎</button>
          <button class="category-action-btn delete-cat" title="Delete">🗑</button>
        </div>
      </div>
    `;
  });

  modal.innerHTML = `
    <div class="link-modal-content link-modal-large">
      <div class="link-modal-header">
        <h3>Manage Categories</h3>
        <button class="link-modal-close" title="Close">×</button>
      </div>
      <div class="link-modal-body">
        <div class="categories-list">
          ${categoriesHtml || '<p class="empty-categories">No custom categories yet.</p>'}
        </div>
        <div class="form-actions">
          <button type="button" class="btn-cancel">Close</button>
          <button type="button" class="btn-primary" id="add-new-category">Add New Category</button>
        </div>
      </div>
    </div>
  `;

  modal.querySelector(".link-modal-close").onclick = closeModals;
  modal.querySelector(".btn-cancel").onclick = closeModals;
  modal.querySelector("#add-new-category").onclick = () => {
    closeModals();
    openCategoryModal();
  };

  modal.querySelectorAll(".edit-cat").forEach((btn) => {
    btn.onclick = () => {
      const categoryName = btn.closest(".category-manage-item").dataset.category;
      closeModals();
      openCategoryModal(categoryName);
    };
  });

  modal.querySelectorAll(".delete-cat").forEach((btn) => {
    btn.onclick = () => {
      const categoryName = btn.closest(".category-manage-item").dataset.category;
      createConfirmDialog(
        `Are you sure you want to delete category "${categoryName}"? All links in this category will be lost.`,
        () => {
          if (deleteCategory(categoryName)) {
            refreshDashboard();
          }
        }
      );
    };
  });

  modal.onkeydown = (e) => {
    if (e.key === "Escape") closeModals();
  };

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("visible"), 10);
}

/**
 * Refresh dashboard after changes
 */
function refreshDashboard() {
  document.dispatchEvent(new CustomEvent("shortcutsChanged"));
}

/* =========================
   Initialization
   ========================= */

/**
 * Initialize link manager
 */
export function initLinkManager() {
  setTimeout(() => {
    addLinkButtons();
    addCategoryManagementButton();
    setupContextMenu();
  }, 100);
}

export {
  customData,
  loadCustomData,
  saveCustomData,
  getAllData,
  addCategory,
  renameCategory,
  deleteCategory,
  addLink,
  editLink,
  deleteLink,
  openLinkModal,
  openCategoryModal,
  closeModals,
  refreshDashboard,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLinkManager);
} else {
  initLinkManager();
}
