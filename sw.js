// Cove service worker — app-shell + artwork caching.
//
// Strategy:
//  - index.html / navigations: stale-while-revalidate — the app boots
//    INSTANTLY from cache every launch (no network round-trip on the
//    critical path); the fresh copy is fetched in the background and lands
//    on the NEXT launch. Falls back to network-first when nothing is cached.
//  - Static shell assets (logo, Google Fonts CSS+woff2, Supabase SDK):
//    stale-while-revalidate — served from cache, refreshed in background.
//  - Album artwork (c.saavncdn.com images): cache-first with a capped
//    runtime cache — art you've seen renders instantly and costs no data.
//  - Everything else (JioSaavn API, audio streams): untouched. The app has
//    its own localStorage caches for API data; audio rides the HTTP cache.
const SHELL_CACHE = "cove-shell-v2";
const IMG_CACHE = "cove-img-v1";
const IMG_CACHE_MAX = 250;
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
    const keep = new Set([SHELL_CACHE, IMG_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
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

// Shell SWR: serve cache immediately, refresh in background. A deploy lands
// one launch later — the price of a zero-network-latency boot.
async function shellSWR(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = (await cache.match(req, { ignoreSearch: true })) || (await cache.match("./index.html")) || (await cache.match("./"));
  if (!hit) return networkFirst(req);
  fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
  return hit;
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

// Artwork: cache-first, capped. Eviction is FIFO via cache key order —
// good enough for album art where any old entry is as evictable as another.
async function imageCacheFirst(req) {
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(req, res.clone()).then(async () => {
      const keys = await cache.keys();
      for (let i = 0; i < keys.length - IMG_CACHE_MAX; i++) cache.delete(keys[i]);
    }).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }

  if (req.mode === "navigate" || (url.origin === self.location.origin && url.pathname.endsWith("/index.html"))) {
    e.respondWith(shellSWR(req));
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
  // Album artwork CDN — images only, never the audio host.
  if (url.hostname === "c.saavncdn.com" || (req.destination === "image" && url.hostname.endsWith(".saavncdn.com"))) {
    e.respondWith(imageCacheFirst(req));
    return;
  }
  // Everything else falls through to the network untouched.
});
