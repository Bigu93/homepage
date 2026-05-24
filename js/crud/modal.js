// js/crud/modal.js
// Generic modal + toast primitives. No deps.

let openModalEl = null;
let escListener = null;

export function openModal({ title, body, footer, onClose, width }) {
  closeModal();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  if (width) dialog.style.maxWidth = width;

  const header = document.createElement("div");
  header.className = "modal-header";
  const h = document.createElement("h2");
  h.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = closeModal;
  header.append(h, closeBtn);

  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  dialog.append(header, bodyEl);

  if (footer) {
    const footerEl = document.createElement("div");
    footerEl.className = "modal-footer";
    if (typeof footer === "string") footerEl.innerHTML = footer;
    else if (footer instanceof Node) footerEl.appendChild(footer);
    dialog.appendChild(footerEl);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  openModalEl = backdrop;

  escListener = (e) => {
    if (e.key === "Escape") closeModal();
  };
  document.addEventListener("keydown", escListener);

  // focus first input if any
  setTimeout(() => {
    const first = dialog.querySelector("input, select, textarea, button");
    if (first) first.focus();
  }, 0);

  if (onClose) backdrop.dataset.onClose = "1";
  backdrop._onClose = onClose;

  return { dialog, body: bodyEl, close: closeModal };
}

export function closeModal() {
  if (!openModalEl) return;
  const cb = openModalEl._onClose;
  openModalEl.remove();
  openModalEl = null;
  if (escListener) {
    document.removeEventListener("keydown", escListener);
    escListener = null;
  }
  if (cb) cb();
}

export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.gap = "0.5rem";
    footer.style.justifyContent = "flex-end";

    const cancel = document.createElement("button");
    cancel.className = "btn";
    cancel.textContent = "Cancel";
    cancel.onclick = () => {
      closeModal();
      resolve(false);
    };

    const ok = document.createElement("button");
    ok.className = danger ? "btn btn-danger" : "btn btn-primary";
    ok.textContent = confirmLabel;
    ok.onclick = () => {
      closeModal();
      resolve(true);
    };

    footer.append(cancel, ok);
    openModal({ title, body: `<p>${message}</p>`, footer, width: "420px" });
  });
}

// --- Toast ---

let toastRoot = null;

function getToastRoot() {
  if (toastRoot) return toastRoot;
  toastRoot = document.createElement("div");
  toastRoot.className = "toast-root";
  document.body.appendChild(toastRoot);
  return toastRoot;
}

export function toast(message, kind = "info", duration = 3500) {
  const root = getToastRoot();
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  root.appendChild(el);
  // trigger enter animation on next frame
  requestAnimationFrame(() => el.classList.add("toast-visible"));
  setTimeout(() => {
    el.classList.remove("toast-visible");
    setTimeout(() => el.remove(), 300);
  }, duration);
}
