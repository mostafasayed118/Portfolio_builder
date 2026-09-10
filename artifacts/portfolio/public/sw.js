/* global self, caches, fetch, URL */

/* Portfolio service worker — offline app-shell caching.
 *
 * Strategy:
 *  - Precache the app shell on install (index.html, manifest, favicon).
 *  - Runtime: cache-first for hashed /assets/* (immutable content),
 *    network-first for navigations with cached-shell fallback (offline).
 *  - Never cache API responses or cross-origin requests (Supabase, fonts…).
 *
 * Bump CACHE_VERSION when deploying a change that should invalidate the cache.
 */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `portfolio-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `portfolio-assets-${CACHE_VERSION}`;

const SHELL_URLS = ["./", "./manifest.json", "./favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never intercept cross-origin traffic (Supabase, Google Fonts, Clarity…) or API calls.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Hashed build assets are immutable: serve from cache, populate on first hit.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigations (SPA routes): network-first, fall back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("./", copy));
          }
          return response;
        })
        .catch(() => caches.match("./"))
    );
  }
});
