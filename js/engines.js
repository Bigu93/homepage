// js/engines.js
// Search engine registry. Built-ins + user-added customs.

import { validateSearchTemplate } from "./url-utils.js";

export const BUILTIN_ENGINES = [
  {
    key: "ddg",
    label: "DuckDuckGo",
    short: "DDG",
    urlTemplate: "https://duckduckgo.com/?q=%s",
  },
  {
    key: "google",
    label: "Google",
    short: "G",
    urlTemplate: "https://www.google.com/search?q=%s",
  },
  {
    key: "bing",
    label: "Bing",
    short: "Bing",
    urlTemplate: "https://www.bing.com/search?q=%s",
  },
  {
    key: "kagi",
    label: "Kagi",
    short: "Kagi",
    urlTemplate: "https://kagi.com/search?q=%s",
  },
];

// Default prefix-shortcuts (user can override via customs).
export const DEFAULT_PREFIXES = [
  {
    key: "g",
    label: "Google",
    urlTemplate: "https://www.google.com/search?q=%s",
  },
  {
    key: "d",
    label: "DuckDuckGo",
    urlTemplate: "https://duckduckgo.com/?q=%s",
  },
  {
    key: "y",
    label: "YouTube",
    urlTemplate: "https://www.youtube.com/results?search_query=%s",
  },
  { key: "gh", label: "GitHub", urlTemplate: "https://github.com/search?q=%s" },
];

export function getAllEngines(overlay) {
  const customs = (overlay.settings?.customEngines || [])
    .filter(validEngine)
    .map((e) => ({
      ...e,
      custom: true,
    }));
  return [...BUILTIN_ENGINES, ...customs];
}

export function getAllPrefixes(overlay) {
  const customs = (overlay.settings?.customEngines || []).filter(validEngine);
  // customs participate as both engine + prefix (key is the prefix)
  return [...DEFAULT_PREFIXES, ...customs];
}

export function resolveEngine(key, overlay) {
  return (
    getAllEngines(overlay).find((e) => e.key === key) || BUILTIN_ENGINES[0]
  );
}

export function searchUrl(template, query) {
  return validateSearchTemplate(template).replace("%s", encodeURIComponent(query));
}

function validEngine(engine) {
  if (!engine?.key || !engine?.urlTemplate) return false;
  try {
    validateSearchTemplate(engine.urlTemplate);
    return true;
  } catch {
    return false;
  }
}

// Returns {prefix, query} if query starts with a known prefix, else null.
export function detectPrefix(query, overlay) {
  const m = /^(\S+)\s+(.+)$/.exec(query);
  if (!m) return null;
  const [, p, rest] = m;
  const all = getAllPrefixes(overlay);
  const match = all.find((e) => e.key === p);
  if (!match) return null;
  return { prefix: match, query: rest };
}
