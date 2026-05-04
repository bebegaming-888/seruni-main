/**
 * Service Worker — Offline-first untuk daerah sinyal lemah
 *
 * Strategy:
 * - App shell: cache-first (HTML, CSS, JS, fonts)
 * - API calls: network-first, fallback to cache
 * - Images: cache-first with size limit
 * - Fonts: stale-while-revalidate
 *
 * Aktivasi: didaftarkan di __root.tsx (production only)
 * Untuk development: dinonaktifkan (SW tidak berjalan di dev mode Vite)
 */

const CACHE_VERSION = "v1";
const STATIC_ASSETS = ["/", "/manifest.json"];

const MAX_IMAGE_CACHE_SIZE = 50; // maks 50 gambar di cache
const MAX_API_CACHE_SIZE = 100; // maks 100 response API

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip chrome-extension, devtools, websocket
  if (
    url.protocol.startsWith("chrome-extension") ||
    url.protocol === "devtools:" ||
    request.mode === "websocket"
  )
    return;

  // API: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Google Fonts (stale-while-revalidate)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Images: cache-first with size management
  if (
    request.destination === "image" ||
    /\.(jpg|jpeg|png|webp|svg|ico)(\?.*)?$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, MAX_IMAGE_CACHE_SIZE));
    return;
  }

  // Default: cache-first (app shell)
  event.respondWith(cacheFirst(request));
});

// ---- Strategies ----

async function cacheFirst(request, maxItems) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (maxItems) await trimCache(cache, maxItems);
    }
    return response;
  } catch {
    return new Response("Offline — resource tidak tersedia", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: "Offline", message: "Tidak ada koneksi internet" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await fetchPromise) ?? new Response("Offline", { status: 503 });
}

async function trimCache(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map((key) => cache.delete(key)));
  }
}

// ---- Push notifications (untuk masa depan) ----
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Sistem Informasi Desa", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/" },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
