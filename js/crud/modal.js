// js/crud/modal.js
// Generic modal + toast primitives. No deps.

let openModalEl = null;
let escListener = null;
let previousFocus = null;

export function openModal({ title, body, footer, onClose, width }) {
  closeModal();
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.tabIndex = -1;
  if (width) dialog.style.maxWidth = width;

  const header = document.createElement("div");
  header.className = "modal-header";
  const h = document.createElement("h2");
  h.id = `modal-title-${Date.now().toString(36)}`;
  h.textContent = title;
  dialog.setAttribute("aria-labelledby", h.id);
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
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") trapFocus(e, dialog);
  };
  document.addEventListener("keydown", escListener);

  // focus first input if any
  setTimeout(() => {
    const first = focusableElements(dialog)[0];
    (first || dialog).focus();
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
  if (previousFocus?.isConnected) previousFocus.focus();
  previousFocus = null;
}

function focusableElements(root) {
  return Array.from(
    root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

function trapFocus(e, dialog) {
  const focusables = focusableElements(dialog);
  if (!focusables.length) {
    e.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
}) {
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
    const msgBody = document.createElement("p");
    msgBody.style.margin = "0";
    msgBody.textContent = message;
    openModal({ title, body: msgBody, footer, width: "420px" });
  });
}

// --- Toast ---

let toastRoot = null;

function getToastRoot() {
  if (toastRoot) return toastRoot;
  toastRoot = document.createElement("div");
  toastRoot.className = "toast-root";
  toastRoot.setAttribute("aria-live", "polite");
  toastRoot.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastRoot);
  return toastRoot;
}

export function toast(message, kind = "info", duration = 3500) {
  const root = getToastRoot();
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.textContent = message;
  root.appendChild(el);
  // trigger enter animation on next frame
  requestAnimationFrame(() => el.classList.add("toast-visible"));
  setTimeout(() => {
    el.classList.remove("toast-visible");
    setTimeout(() => el.remove(), 300);
  }, duration);
}
