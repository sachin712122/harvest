/**
 * AgriVision Service Worker
 * Provides offline caching for core assets so the app loads instantly and
 * works (for previously visited pages) even without a network connection.
 */

const CACHE_NAME = "agrivision-v1";

// Assets that are cached on install for offline-first loading
const PRECACHE_URLS = [
  "/",
  "/static/css/style.css",
  "/static/js/main.js",
  "/static/data/crops.json",
  "/static/manifest.json",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png"
];

// ── Install: pre-cache core assets ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API calls, cache-first for static assets ────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always fetch API requests from the network (skip cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first strategy for all other requests
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Cache successful GET responses for static assets
          if (
            response.ok &&
            event.request.method === "GET" &&
            (url.pathname.startsWith("/static/") || url.pathname === "/")
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Serve the main page from cache when offline
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
