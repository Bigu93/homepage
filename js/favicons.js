// js/favicons.js
// Favicon URL helper + 30-day localStorage cache.

const CACHE_KEY = "favicons_cache";
const EXPIRY_DAYS = 30;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("[favicons] cache parse failed:", e);
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("[favicons] cache write failed:", e);
  }
}

export function getFavicon(url) {
  const cache = readCache();
  const cached = cache[url];
  if (cached && Date.now() < cached.timestamp + EXPIRY_MS) {
    return cached.faviconUrl;
  }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;
  cache[url] = { faviconUrl, timestamp: Date.now() };
  writeCache(cache);
  return faviconUrl;
}

export function clearExpiredFavicons() {
  const cache = readCache();
  const cutoff = Date.now() - EXPIRY_MS;
  let changed = false;
  for (const key in cache) {
    if (cache[key].timestamp < cutoff) {
      delete cache[key];
      changed = true;
    }
  }
  if (changed) writeCache(cache);
}
