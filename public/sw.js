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
 *
 * Cache versioning:
 * - Version di-inject saat registrasi via query param: /sw.js?v=xxxx
 * - Setiap deploy baru punya version berbeda → old cache otomatis dibuang
 */

const STATIC_ASSETS = ["/", "/manifest.json"];

const MAX_IMAGE_CACHE_SIZE = 50;
const MAX_API_CACHE_SIZE = 100;

// ═══════════════════════════════════════════════════════════════
// NOTE: CACHE_VERSION disetel di event listener install/activate
// via URL search param ?v= (diinjeksi oleh __root.tsx saat registrasi)
// ═══════════════════════════════════════════════════════════════

self.addEventListener("install", (event) => {
  const url = new URL(self.location.href);
  const version = url.searchParams.get("v") ?? "v1";

  event.waitUntil(
    caches
      .open(version)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const url = new URL(self.location.href);
  const currentVersion = url.searchParams.get("v") ?? "v1";

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== currentVersion).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (
    url.protocol.startsWith("chrome-extension") ||
    url.protocol === "devtools:" ||
    request.mode === "websocket"
  )
    return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (
    request.destination === "image" ||
    /\.(jpg|jpeg|png|webp|svg|ico)(\?.*)?$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, MAX_IMAGE_CACHE_SIZE));
    return;
  }

  event.respondWith(cacheFirst(request));
});

// ---- Strategies ----

async function cacheFirst(request, maxItems) {
  const url = new URL(request.url);
  const version = url.searchParams.get("v") ?? "v1";
  const cache = await caches.open(version);
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
      const url = new URL(request.url);
      const version = url.searchParams.get("v") ?? "v1";
      const cache = await caches.open(version);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const url = new URL(request.url);
    const version = url.searchParams.get("v") ?? "v1";
    const cache = await caches.open(version);
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
  const url = new URL(request.url);
  const version = url.searchParams.get("v") ?? "v1";
  const cache = await caches.open(version);
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

// ---- Push notifications ----
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Sistem Informasi Desa", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
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
