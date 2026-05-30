// js/url-utils.js
// Shared URL validation for user-provided links and search templates.

export function parseHttpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are allowed.");
  }
  return url;
}

export function isSafeHttpUrl(value) {
  try {
    parseHttpUrl(value);
    return true;
  } catch {
    return false;
  }
}

export function safeHttpHref(value) {
  return isSafeHttpUrl(value) ? value : "#";
}

export function openSafeUrl(value, target = "_blank") {
  if (!isSafeHttpUrl(value)) return false;
  window.open(value, target);
  return true;
}

export function validateSearchTemplate(template) {
  if (!template.includes("%s")) {
    throw new Error("Search URL must include %s for the query.");
  }
  parseHttpUrl(template.replace("%s", "test"));
  return template;
}
