// Cove service worker — app-shell caching.
//
// Strategy:
//  - index.html / navigations: network-first with a 3.5s timeout, falling
//    back to cache. Updates land immediately when online; the app still
//    boots instantly on flaky mobile data and fully offline.
//  - Static shell assets (logo, Google Fonts CSS+woff2, Supabase SDK):
//    stale-while-revalidate — served from cache, refreshed in background.
//  - Everything else (JioSaavn API, song streams, artwork CDN): untouched.
//    The app has its own localStorage caches for API data, and audio/images
//    ride the regular browser HTTP cache.
const SHELL_CACHE = "cove-shell-v1";
const STATIC_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    try {
      const c = await caches.open(SHELL_CACHE);
      await c.addAll(["./", "./index.html", "./cove-logo.png"]);
    } catch {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== SHELL_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function networkFirst(req, timeoutMs = 3500) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(t);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (await cache.match("./index.html")) || (await cache.match("./"));
    if (hit) return hit;
    throw new Error("offline and not cached");
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req);
  const refetch = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) return hit;
  const fresh = await refetch;
  if (fresh) return fresh;
  return fetch(req);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }

  if (req.mode === "navigate" || (url.origin === self.location.origin && url.pathname.endsWith("/index.html"))) {
    e.respondWith(networkFirst(req));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.endsWith("/cove-logo.png")) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (STATIC_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  // Everything else falls through to the network untouched.
});
