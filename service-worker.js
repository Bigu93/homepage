// service-worker.js
// Cache strategy:
//   - Static shell (HTML/CSS/JS): cache-first, versioned cache
//   - /api/v1/favicon, /api/v1/weather: stale-while-revalidate
//   - /api/v1/sync, /api/v1/stats/*, /api/v1/handoff/*: network-first (never stale)
//   - Everything else: network-first with offline fallback to cache

const SHELL_CACHE = "startpage-shell-v1";
const DYNAMIC_CACHE = "startpage-dynamic-v1";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "/manifest.webmanifest",
];

// ---------------------------------------------------------------------------
// Install — pre-cache shell
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — evict old caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, DYNAMIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin or API requests
  if (url.origin !== location.origin && !url.pathname.startsWith("/api/"))
    return;

  const path = url.pathname;

  // Never cache — network-only (real-time data)
  if (
    path.startsWith("/api/v1/sync") ||
    path.startsWith("/api/v1/stats") ||
    path.startsWith("/api/v1/handoff") ||
    path.startsWith("/api/v1/tailscale") ||
    path.startsWith("/api/v1/probes")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Stale-while-revalidate for favicon + weather
  if (
    path.startsWith("/api/v1/favicon") ||
    path.startsWith("/api/v1/weather")
  ) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Shell assets — cache-first
  if (isShellAsset(path)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // JS/CSS modules — cache-first with dynamic cache
  if (path.startsWith("/js/") || path.startsWith("/styles/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}

function isShellAsset(path) {
  return (
    path === "/" ||
    path === "/index.html" ||
    path === "/favicon.png" ||
    path === "/manifest.webmanifest"
  );
}
