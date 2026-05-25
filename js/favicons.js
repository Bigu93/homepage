// js/favicons.js
// Favicon URL + bytes cache. 30-day TTL.
// First fetch returns the remote URL (and kicks off a background dataURL copy
// into localStorage). Subsequent loads return the dataURL — works offline and
// without re-hitting Google's favicon endpoint.

const CACHE_KEY = "favicons_cache";
const EXPIRY_DAYS = 30;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// In-flight dataURL conversions, keyed by link URL, to avoid stampedes.
const inFlight = new Set();

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
    // QuotaExceeded — drop the oldest half and retry once.
    if (e && /quota/i.test(e.name || e.message || "")) {
      const trimmed = trimCache(cache, 0.5);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
        return;
      } catch (e2) {
        console.warn("[favicons] cache trim+write failed:", e2);
        return;
      }
    }
    console.warn("[favicons] cache write failed:", e);
  }
}

function trimCache(cache, fraction) {
  const entries = Object.entries(cache).sort(
    (a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0),
  );
  const dropCount = Math.ceil(entries.length * fraction);
  const kept = entries.slice(dropCount);
  return Object.fromEntries(kept);
}

function remoteUrlFor(url) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`;
}

async function persistDataUrl(linkUrl, remote) {
  if (inFlight.has(linkUrl)) return;
  inFlight.add(linkUrl);
  try {
    const res = await fetch(remote, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    // Skip absurdly large favicons defensively (>32KB).
    if (blob.size > 32 * 1024) throw new Error("favicon too large");
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error || new Error("read failed"));
      fr.readAsDataURL(blob);
    });
    const cache = readCache();
    cache[linkUrl] = {
      dataUrl,
      faviconUrl: remote,
      timestamp: Date.now(),
    };
    writeCache(cache);
  } catch {
    // CORS/network/quota — fall back to URL-only cache entry.
    const cache = readCache();
    cache[linkUrl] = { faviconUrl: remote, timestamp: Date.now() };
    writeCache(cache);
  } finally {
    inFlight.delete(linkUrl);
  }
}

export function getFavicon(url) {
  const cache = readCache();
  const cached = cache[url];
  const fresh = cached && Date.now() < cached.timestamp + EXPIRY_MS;
  if (fresh) {
    // Prefer bytes when we have them.
    if (cached.dataUrl) return cached.dataUrl;
    return cached.faviconUrl;
  }
  const remote = remoteUrlFor(url);
  // Fire-and-forget byte caching for next load.
  persistDataUrl(url, remote);
  return remote;
}

export function clearExpiredFavicons() {
  const cache = readCache();
  const cutoff = Date.now() - EXPIRY_MS;
  let changed = false;
  for (const key in cache) {
    if ((cache[key].timestamp || 0) < cutoff) {
      delete cache[key];
      changed = true;
    }
  }
  if (changed) writeCache(cache);
}
