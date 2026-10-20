/* Bump CACHE and both versioned FILES with index.html whenever JS/CSS changes. */
const CACHE = "gastalo-v34";
const FILES = [
  "./",
  "./index.html",
  "./styles.css?v=34",
  "./app.js?v=34",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
// Activate after existing windows close so an open form keeps its matching JS/CSS.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("gastalo-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  // Cache only app-shell resources; no repository documents or user files.
  if (
    event.request.mode !== "navigate" &&
    !FILES.some(
      (path) => new URL(path, self.registration.scope).href === url.href,
    )
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(event.request, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        // Keep the versioned shell immutable in this cache. A new shell installs in a new cache.
        return response;
      } catch {
        return (
          (await cache.match(event.request)) ||
          (event.request.mode === "navigate"
            ? await cache.match("./index.html")
            : null) ||
          Response.error()
        );
      } finally {
        clearTimeout(timeout);
      }
    })(),
  );
});
