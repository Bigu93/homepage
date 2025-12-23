/* =========================
   Calendar Module
   ========================= */

/* =========================
   State & DOM
   ========================= */
const calendarState = {
  events: JSON.parse(localStorage.getItem("calendar_events") || "[]"),
  editingEventId: null,
};

const calendarDom = {
  // Will be populated when DOM is ready
};

/* =========================
   Event Categories
   ========================= */
const EVENT_CATEGORIES = {
  default: { name: "Default", color: "#9ca3af", bg: "rgba(156, 163, 175, 0.15)" },
  work: { name: "Work", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.15)" },
  personal: { name: "Personal", color: "#4ade80", bg: "rgba(74, 222, 128, 0.15)" },
  important: { name: "Important", color: "#fb7185", bg: "rgba(251, 113, 133, 0.15)" },
  other: { name: "Other", color: "#c084fc", bg: "rgba(192, 132, 252, 0.15)" },
};

/* =========================
   Utility Functions
   ========================= */

/**
 * Generate a unique ID for events
 * @returns {string} - Unique ID
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save events to localStorage
 */
function saveEvents() {
  try {
    localStorage.setItem("calendar_events", JSON.stringify(calendarState.events));
  } catch (e) {
    console.warn("Failed to save calendar events:", e);
  }
}

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format time for display
 * @param {string} time - Time string (HH:MM)
 * @returns {string} - Formatted time string
 */
function formatTime(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Check if a date is today
 * @param {Date} date - Date object
 * @returns {boolean} - True if today
 */
function isToday(date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get events for a specific date
 * @param {Date} date - Date object
 * @returns {Array} - Array of events for the date
 */
function getEventsForDate(date) {
  const dateStr = date.toISOString().split("T")[0];
  return calendarState.events
    .filter((event) => event.date === dateStr)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

/**
 * Get events for the next 7 days
 * @returns {Object} - Object with dates as keys and events as values
 */
function getUpcomingEvents() {
  const upcoming = {};
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const events = getEventsForDate(date);
    
    if (events.length > 0) {
      upcoming[dateStr] = {
        date,
        events,
      };
    }
  }
  
  return upcoming;
}

/* =========================
   Rendering Functions
   ========================= */

/**
 * Render event card
 * @param {Object} event - Event object
 * @param {boolean} isToday - Whether the event is today
 * @returns {HTMLElement} - Event card element
 */
function renderEventCard(event, isToday = false) {
  const card = document.createElement("div");
  card.className = `calendar-event-card ${isToday ? "calendar-event-today" : ""}`;
  card.dataset.id = event.id;
  
  const category = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.default;
  
  card.innerHTML = `
    <div class="calendar-event-header">
      <span class="calendar-event-time">${formatTime(event.time)}</span>
      <span class="calendar-event-category" style="color: ${category.color}">${category.name}</span>
    </div>
    <div class="calendar-event-title">${event.title}</div>
    ${event.description ? `<div class="calendar-event-description">${event.description}</div>` : ""}
    <div class="calendar-event-footer">
      <span class="calendar-event-duration">${event.duration || ""}</span>
      <div class="calendar-event-actions">
        <button class="calendar-action-btn edit-btn" title="Edit event">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button class="calendar-action-btn delete-btn" title="Delete event">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const editBtn = card.querySelector(".edit-btn");
  const deleteBtn = card.querySelector(".delete-btn");
  
  editBtn.addEventListener("click", () => openEventModal(event));
  deleteBtn.addEventListener("click", () => deleteEvent(event.id));
  
  return card;
}

/**
 * Render today's events section
 */
function renderTodayEvents() {
  const container = document.getElementById("calendar-today-events");
  if (!container) return;
  
  const today = new Date();
  const events = getEventsForDate(today);
  
  if (events.length === 0) {
    container.innerHTML = `
      <div class="calendar-empty-state">
        <p>No events scheduled for today</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = "";
  events.forEach((event) => {
    container.appendChild(renderEventCard(event, true));
  });
}

/**
 * Render upcoming events section
 */
function renderUpcomingEvents() {
  const container = document.getElementById("calendar-upcoming-events");
  if (!container) return;
  
  const upcoming = getUpcomingEvents();
  const dates = Object.keys(upcoming);
  
  if (dates.length === 0) {
    container.innerHTML = `
      <div class="calendar-empty-state">
        <p>No upcoming events in the next 7 days</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = "";
  
  dates.forEach((dateStr) => {
    const { date, events } = upcoming[dateStr];
    
    const daySection = document.createElement("div");
    daySection.className = "calendar-day-section";
    
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.innerHTML = `
      <span class="calendar-day-name">${formatDate(date)}</span>
      <span class="calendar-day-count">${events.length} event${events.length > 1 ? "s" : ""}</span>
    `;
    
    const dayEvents = document.createElement("div");
    dayEvents.className = "calendar-day-events";
    
    events.forEach((event) => {
      dayEvents.appendChild(renderEventCard(event, isToday(date)));
    });
    
    daySection.appendChild(dayHeader);
    daySection.appendChild(dayEvents);
    container.appendChild(daySection);
  });
}

/**
 * Render all calendar sections
 */
function renderCalendar() {
  renderTodayEvents();
  renderUpcomingEvents();
}

/* =========================
   Modal Functions
   ========================= */

/**
 * Open event modal for adding or editing
 * @param {Object} event - Event object (null for new event)
 */
function openEventModal(event = null) {
  const modal = document.getElementById("calendar-modal");
  if (!modal) return;
  
  calendarState.editingEventId = event ? event.id : null;
  
  const titleEl = document.getElementById("calendar-event-title");
  const modalTitle = document.getElementById("calendar-modal-title");
  
  if (event) {
    modalTitle.textContent = "Edit Event";
    titleEl.textContent = "Edit Event";
    document.getElementById("event-title-input").value = event.title || "";
    document.getElementById("event-description-input").value = event.description || "";
    document.getElementById("event-date-input").value = event.date || "";
    document.getElementById("event-time-input").value = event.time || "";
    document.getElementById("event-duration-input").value = event.duration || "";
    document.getElementById("event-category-input").value = event.category || "default";
    document.getElementById("event-reminder-input").value = event.reminder || "none";
  } else {
    modalTitle.textContent = "Add Event";
    titleEl.textContent = "New Event";
    document.getElementById("event-title-input").value = "";
    document.getElementById("event-description-input").value = "";
    document.getElementById("event-date-input").value = new Date().toISOString().split("T")[0];
    document.getElementById("event-time-input").value = "";
    document.getElementById("event-duration-input").value = "";
    document.getElementById("event-category-input").value = "default";
    document.getElementById("event-reminder-input").value = "none";
  }
  
  modal.classList.add("visible");
}

/**
 * Close event modal
 */
function closeEventModal() {
  const modal = document.getElementById("calendar-modal");
  if (!modal) return;
  
  modal.classList.remove("visible");
  calendarState.editingEventId = null;
}

/**
 * Save event from modal
 */
function saveEvent() {
  const title = document.getElementById("event-title-input").value.trim();
  const description = document.getElementById("event-description-input").value.trim();
  const date = document.getElementById("event-date-input").value;
  const time = document.getElementById("event-time-input").value;
  const duration = document.getElementById("event-duration-input").value.trim();
  const category = document.getElementById("event-category-input").value;
  const reminder = document.getElementById("event-reminder-input").value;
  
  if (!title) {
    alert("Please enter an event title");
    return;
  }
  
  if (!date) {
    alert("Please select a date");
    return;
  }
  
  if (calendarState.editingEventId) {
    // Update existing event
    const eventIndex = calendarState.events.findIndex(
      (e) => e.id === calendarState.editingEventId
    );
    
    if (eventIndex !== -1) {
      calendarState.events[eventIndex] = {
        ...calendarState.events[eventIndex],
        title,
        description,
        date,
        time,
        duration,
        category,
        reminder,
      };
    }
  } else {
    // Create new event
    const newEvent = {
      id: generateEventId(),
      title,
      description,
      date,
      time,
      duration,
      category,
      reminder,
    };
    
    calendarState.events.push(newEvent);
  }
  
  saveEvents();
  renderCalendar();
  closeEventModal();
}

/**
 * Delete event
 * @param {string} eventId - Event ID
 */
function deleteEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) {
    return;
  }
  
  calendarState.events = calendarState.events.filter((e) => e.id !== eventId);
  saveEvents();
  renderCalendar();
}

/* =========================
   Initialization
   ========================= */

/**
 * Initialize calendar module
 */
function initCalendar() {
  // Get DOM elements
  calendarDom.modal = document.getElementById("calendar-modal");
  calendarDom.modalClose = document.getElementById("calendar-modal-close");
  calendarDom.cancelBtn = document.getElementById("cancel-event-btn");
  calendarDom.saveBtn = document.getElementById("save-event-btn");
  calendarDom.addEventBtn = document.getElementById("add-event-btn");
  
  // Setup modal event listeners
  if (calendarDom.modalClose) {
    calendarDom.modalClose.addEventListener("click", closeEventModal);
  }
  
  if (calendarDom.cancelBtn) {
    calendarDom.cancelBtn.addEventListener("click", closeEventModal);
  }
  
  if (calendarDom.saveBtn) {
    calendarDom.saveBtn.addEventListener("click", saveEvent);
  }
  
  if (calendarDom.addEventBtn) {
    calendarDom.addEventBtn.addEventListener("click", () => openEventModal());
  }
  
  // Close modal on backdrop click
  if (calendarDom.modal) {
    calendarDom.modal.addEventListener("click", (e) => {
      if (e.target === calendarDom.modal) {
        closeEventModal();
      }
    });
  }
  
  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && calendarDom.modal?.classList.contains("visible")) {
      closeEventModal();
    }
  });
  
  // Initial render
  renderCalendar();
  
  // Refresh calendar every minute to update "today" status
  setInterval(renderCalendar, 60000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCalendar);
} else {
  initCalendar();
}

// Export for use by other modules
export { renderCalendar, openEventModal, closeEventModal };
