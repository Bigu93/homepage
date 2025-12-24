/* =========================
   Notes Widget Module
   ========================= */

const STORAGE_KEY = "notes_data";

/* =========================
   State & DOM
   ========================= */
const state = {
  notes: [],
  editingId: null,
  selectedColor: "default"
};

const dom = {};

/* =========================
   Icons (Lucide/Heroicons SVG strings)
   ========================= */
const ICONS = {
  note: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  pinFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
  save: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

/* =========================
   Color Options
   ========================= */
const COLORS = {
  default: { class: "note-default", bg: "rgba(55, 65, 81, 0.4)", border: "rgba(75, 85, 99, 0.4)" },
  yellow: { class: "note-yellow", bg: "rgba(250, 204, 21, 0.15)", border: "rgba(250, 204, 21, 0.3)" },
  blue: { class: "note-blue", bg: "rgba(96, 165, 250, 0.15)", border: "rgba(96, 165, 250, 0.3)" },
  green: { class: "note-green", bg: "rgba(74, 222, 128, 0.15)", border: "rgba(74, 222, 128, 0.3)" },
  red: { class: "note-red", bg: "rgba(251, 113, 133, 0.15)", border: "rgba(251, 113, 133, 0.3)" },
  purple: { class: "note-purple", bg: "rgba(192, 132, 252, 0.15)", border: "rgba(192, 132, 252, 0.3)" }
};

/* =========================
   Storage Functions
   ========================= */
function loadNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state.notes = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to load notes:", e);
    state.notes = [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
  } catch (e) {
    console.warn("Failed to save notes:", e);
  }
}

/* =========================
   Note Operations
   ========================= */
function createNote(content, color) {
  const now = Date.now();
  const note = {
    id: now,
    content: content.trim(),
    color: color,
    pinned: false,
    createdAt: now,
    updatedAt: now
  };
  state.notes.push(note);
  saveNotes();
  return note;
}

function updateNote(id, content, color) {
  const note = state.notes.find(n => n.id === id);
  if (note) {
    note.content = content.trim();
    note.color = color;
    note.updatedAt = Date.now();
    saveNotes();
  }
  return note;
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveNotes();
}

function togglePin(id) {
  const note = state.notes.find(n => n.id === id);
  if (note) {
    note.pinned = !note.pinned;
    saveNotes();
  }
  return note;
}

function getSortedNotes() {
  return [...state.notes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return b.pinned - a.pinned;
    }
    return b.updatedAt - a.updatedAt;
  });
}

/* =========================
   UI Rendering
   ========================= */
function initDOM() {
  dom.notesSection = document.getElementById("notes-section");
  dom.notesGrid = document.getElementById("notes-grid");
  dom.addNoteBtn = document.getElementById("add-note-btn");
  dom.notesModal = document.getElementById("notes-modal");
  dom.notesModalContent = document.getElementById("notes-modal-content");
  dom.modalClose = document.getElementById("notes-modal-close");
  dom.noteInput = document.getElementById("note-input");
  dom.colorPicker = document.getElementById("note-color-picker");
  dom.saveNoteBtn = document.getElementById("save-note-btn");
  dom.cancelNoteBtn = document.getElementById("cancel-note-btn");
}

function renderNotes() {
  if (!dom.notesGrid) return;
  
  dom.notesGrid.innerHTML = "";
  const sortedNotes = getSortedNotes();
  
  if (sortedNotes.length === 0) {
    dom.notesGrid.innerHTML = `
      <div class="notes-empty">
        <p>No notes yet. Click the + button to create one.</p>
      </div>
    `;
    return;
  }
  
  sortedNotes.forEach(note => {
    const noteEl = createNoteElement(note);
    dom.notesGrid.appendChild(noteEl);
  });
}

function createNoteElement(note) {
  const colorConfig = COLORS[note.color] || COLORS.default;
  
  const noteEl = document.createElement("div");
  noteEl.className = `note-card ${colorConfig.class}`;
  noteEl.dataset.id = note.id;
  
  const header = document.createElement("div");
  header.className = "note-header";
  
  const pinBtn = document.createElement("button");
  pinBtn.className = `note-pin-btn ${note.pinned ? "pinned" : ""}`;
  pinBtn.innerHTML = note.pinned ? ICONS.pinFilled : ICONS.pin;
  pinBtn.title = note.pinned ? "Unpin note" : "Pin note";
  pinBtn.onclick = () => {
    togglePin(note.id);
    renderNotes();
  };
  
  const actions = document.createElement("div");
  actions.className = "note-actions";
  
  const editBtn = document.createElement("button");
  editBtn.className = "note-action-btn edit-btn";
  editBtn.innerHTML = ICONS.edit;
  editBtn.title = "Edit note";
  editBtn.onclick = () => openEditModal(note);
  
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "note-action-btn delete-btn";
  deleteBtn.innerHTML = ICONS.trash;
  deleteBtn.title = "Delete note";
  deleteBtn.onclick = () => confirmDelete(note.id);
  
  actions.append(editBtn, deleteBtn);
  header.append(pinBtn, actions);
  
  const content = document.createElement("div");
  content.className = "note-content";
  content.textContent = note.content;
  
  const footer = document.createElement("div");
  footer.className = "note-footer";
  const dateStr = new Date(note.updatedAt).toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
  footer.textContent = dateStr;
  
  noteEl.append(header, content, footer);
  return noteEl;
}

/* =========================
   Modal Functions
   ========================= */
function openModal() {
  state.editingId = null;
  state.selectedColor = "default";
  dom.noteInput.value = "";
  dom.colorPicker.value = "default";
  dom.saveNoteBtn.textContent = "Add Note";
  dom.notesModal.classList.add("visible");
  dom.noteInput.focus();
}

function openEditModal(note) {
  state.editingId = note.id;
  state.selectedColor = note.color;
  dom.noteInput.value = note.content;
  dom.colorPicker.value = note.color;
  dom.saveNoteBtn.textContent = "Save Note";
  dom.notesModal.classList.add("visible");
  dom.noteInput.focus();
}

function closeModal() {
  dom.notesModal.classList.remove("visible");
  state.editingId = null;
}

function saveFromModal() {
  const content = dom.noteInput.value.trim();
  if (!content) {
    dom.noteInput.focus();
    return;
  }
  
  const color = dom.colorPicker.value;
  
  if (state.editingId) {
    updateNote(state.editingId, content, color);
  } else {
    createNote(content, color);
  }
  
  closeModal();
  renderNotes();
}

function confirmDelete(id) {
  if (confirm("Are you sure you want to delete this note?")) {
    deleteNote(id);
    renderNotes();
  }
}

/* =========================
   Event Listeners
   ========================= */
function bindEvents() {
  dom.addNoteBtn?.addEventListener("click", openModal);
  dom.modalClose?.addEventListener("click", closeModal);
  dom.saveNoteBtn?.addEventListener("click", saveFromModal);
  dom.cancelNoteBtn?.addEventListener("click", closeModal);
  
  dom.notesModal?.addEventListener("click", (e) => {
    if (e.target === dom.notesModal) {
      closeModal();
    }
  });
  
  dom.noteInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      saveFromModal();
    } else if (e.key === "Escape") {
      closeModal();
    }
  });
  
  dom.colorPicker?.addEventListener("change", (e) => {
    state.selectedColor = e.target.value;
  });
}

/* =========================
   Initialization
   ========================= */
function initNotes() {
  initDOM();
  loadNotes();
  renderNotes();
  bindEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNotes);
} else {
  initNotes();
}

export { createNote, updateNote, deleteNote, togglePin, getSortedNotes, loadNotes, saveNotes };
