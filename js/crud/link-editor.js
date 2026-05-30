// js/crud/link-editor.js
// Add / edit / delete a single link.

import { openModal, closeModal, confirmDialog, toast } from "./modal.js";
import { save as saveOverlay } from "../storage.js";
import { loadFavicon } from "../favicons.js";
import { parseHttpUrl } from "../url-utils.js";

let overlayRef = null;
let categoriesRef = [];
let onChangeCb = null;

export function initLinkEditor({ overlay, getCategories, onChange }) {
  overlayRef = overlay;
  categoriesRef = getCategories();
  onChangeCb = () => {
    categoriesRef = getCategories();
    if (onChange) onChange();
  };
}

function persist() {
  saveOverlay(overlayRef);
  onChangeCb();
}

function makeLinkId(name) {
  const slug = (name || "link")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `lnk-user-${slug}-${Date.now().toString(36)}`;
}

export function openLinkEditor({
  linkId = null,
  defaultCategoryId = null,
} = {}) {
  const isEdit = !!linkId;
  let existing = null;
  let existingCatId = null;
  if (isEdit) {
    for (const cat of categoriesRef) {
      const found = cat.items.find((l) => l.id === linkId);
      if (found) {
        existing = found;
        existingCatId = cat.id;
        break;
      }
    }
    if (!existing) {
      toast("Link not found.", "error");
      return;
    }
  }

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="field">
      <label>Name</label>
      <input id="lnk-name" type="text" maxlength="80" required>
      <div class="error" id="lnk-name-err" style="display:none">Name is required.</div>
    </div>
    <div class="field">
      <label>URL</label>
      <input id="lnk-url" type="url" placeholder="https://example.com" required>
      <div class="error" id="lnk-url-err" style="display:none"></div>
    </div>
    <div class="field">
      <label>Category</label>
      <select id="lnk-cat"></select>
    </div>
    <div class="field">
      <label>Preview</label>
      <div class="link-preview">
        <div class="link-favicon"><img id="lnk-preview-img" alt=""></div>
        <span id="lnk-preview-name" class="link-title">—</span>
      </div>
    </div>
  `;

  const nameI = body.querySelector("#lnk-name");
  const urlI = body.querySelector("#lnk-url");
  const catS = body.querySelector("#lnk-cat");
  const previewImg = body.querySelector("#lnk-preview-img");
  const previewName = body.querySelector("#lnk-preview-name");
  const nameErr = body.querySelector("#lnk-name-err");
  const urlErr = body.querySelector("#lnk-url-err");

  // populate category select
  categoriesRef.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.category;
    catS.appendChild(opt);
  });

  if (isEdit) {
    nameI.value = existing.name;
    urlI.value = existing.url;
    catS.value = existingCatId;
    previewName.textContent = existing.name;
    loadFavicon(previewImg, existing.url);
  } else if (defaultCategoryId) {
    catS.value = defaultCategoryId;
  }

  const updatePreview = () => {
    previewName.textContent = nameI.value || "—";
    if (urlI.value) {
      try {
        parseHttpUrl(urlI.value);
        loadFavicon(previewImg, urlI.value);
      } catch {
        /* invalid url, leave previous */
      }
    }
  };

  let debounceT;
  urlI.addEventListener("input", () => {
    clearTimeout(debounceT);
    debounceT = setTimeout(updatePreview, 400);
  });
  nameI.addEventListener("input", updatePreview);

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "0.5rem";
  footer.style.justifyContent = "space-between";

  const leftGroup = document.createElement("div");
  if (isEdit) {
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      const ok = await confirmDialog({
        title: "Delete link",
        message: `Delete “${existing.name}”? Cannot be undone (until you Reset).`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
      deleteLink(existing.id);
      closeModal();
      toast("Deleted.", "success");
    };
    leftGroup.appendChild(delBtn);
  }

  const rightGroup = document.createElement("div");
  rightGroup.style.display = "flex";
  rightGroup.style.gap = "0.5rem";
  const cancel = document.createElement("button");
  cancel.className = "btn";
  cancel.textContent = "Cancel";
  cancel.onclick = closeModal;
  const save = document.createElement("button");
  save.className = "btn btn-primary";
  save.textContent = isEdit ? "Save" : "Add link";
  save.onclick = () => {
    const name = nameI.value.trim();
    const url = urlI.value.trim();
    nameErr.style.display = "none";
    urlErr.style.display = "none";
    nameI.classList.remove("invalid");
    urlI.classList.remove("invalid");

    let bad = false;
    if (!name) {
      nameErr.style.display = "block";
      nameI.classList.add("invalid");
      bad = true;
    }
    try {
      parseHttpUrl(url);
    } catch (e) {
      urlErr.textContent = e.message;
      urlErr.style.display = "block";
      urlI.classList.add("invalid");
      bad = true;
    }
    if (bad) return;

    if (isEdit) {
      editLink(existing.id, existingCatId, {
        name,
        url,
        categoryId: catS.value,
      });
    } else {
      addLink(catS.value, { id: makeLinkId(name), name, url });
    }
    closeModal();
    toast(isEdit ? "Saved." : "Link added.", "success");
  };
  rightGroup.append(cancel, save);

  footer.append(leftGroup, rightGroup);

  const modal = openModal({
    title: isEdit ? "Edit link" : "New link",
    body,
    footer,
    width: "440px",
  });

  modal.dialog.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      save.click();
    }
  });
}

function addLink(catId, link) {
  if (!overlayRef.added.links[catId]) overlayRef.added.links[catId] = [];
  overlayRef.added.links[catId].push(link);
  persist();
}

function editLink(linkId, currentCatId, patch) {
  // If link is in `added`, mutate it directly (cleaner state).
  for (const catId in overlayRef.added.links) {
    const arr = overlayRef.added.links[catId];
    const idx = arr.findIndex((l) => l.id === linkId);
    if (idx !== -1) {
      if (patch.categoryId && patch.categoryId !== catId) {
        // move between added buckets
        const [moved] = arr.splice(idx, 1);
        Object.assign(moved, patch);
        if (!overlayRef.added.links[patch.categoryId])
          overlayRef.added.links[patch.categoryId] = [];
        overlayRef.added.links[patch.categoryId].push(moved);
      } else {
        Object.assign(arr[idx], patch);
      }
      persist();
      return;
    }
  }
  // Otherwise seed link — write to overlay.edited
  overlayRef.edited.links[linkId] = {
    ...(overlayRef.edited.links[linkId] || {}),
    ...patch,
  };
  persist();
}

function deleteLink(linkId) {
  // If added: just remove from added bucket
  for (const catId in overlayRef.added.links) {
    const arr = overlayRef.added.links[catId];
    const idx = arr.findIndex((l) => l.id === linkId);
    if (idx !== -1) {
      arr.splice(idx, 1);
      // also remove from favorites
      overlayRef.favorites = overlayRef.favorites.filter((id) => id !== linkId);
      persist();
      return;
    }
  }
  // Seed link: add to deleted
  if (!overlayRef.deleted.links.includes(linkId)) {
    overlayRef.deleted.links.push(linkId);
  }
  overlayRef.favorites = overlayRef.favorites.filter((id) => id !== linkId);
  delete overlayRef.edited.links[linkId];
  persist();
}
