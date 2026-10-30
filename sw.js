/* Bump CACHE and both versioned FILES with index.html whenever JS/CSS changes. */
const CACHE = "gastalo-v51";
const FILES = [
  "./",
  "./index.html",
  "./styles.css?v=51",
  "./app.js?v=51",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/demo/chase.svg",
  "./icons/demo/robinhood.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
// Existing pages keep their loaded JS/CSS; the page defers refreshing open forms.
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
      // The installed shell is immutable and can paint immediately. Foreground
      // app-check requests still reach the network; newer explicit releases must
      // bypass an older worker so a cached index cannot trap the update loop.
      const navigate = event.request.mode === "navigate";
      const installedVersion = Number(CACHE.match(/v(\d+)$/)[1]);
      const newerRelease = Number(url.searchParams.get("app-version")) > installedVersion;
      const cached = (await cache.match(event.request)) || (navigate ? await cache.match("./index.html") : null);
      if (cached && !newerRelease) return cached;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(event.request, {
          signal: controller.signal,
          cache: "no-cache",
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
