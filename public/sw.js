// Minimal service worker: caches the app shell for offline/instant loads,
// and network-first for the API so data is never stale-served on purpose.
//
// --- Bumping the cache ---
// Bump CACHE_VERSION any time you change ANY file in the app shell (HTML,
// CSS, JS, icons). Old caches are deleted automatically on the next
// activation once clients reload. If you don't bump this, installed PWAs
// may keep serving old shell files indefinitely.
const CACHE_VERSION = "v1";
const CACHE_NAME = `chore-tracker-shell-${CACHE_VERSION}`;

const SHELL_FILES = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/config.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    // Network-first: always try to get live data; only fall back to a
    // cached response (if any) when the network is unavailable.
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for the app shell: instant load, background revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
