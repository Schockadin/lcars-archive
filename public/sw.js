// Service Worker: (1) Web Push (Zustellung/Klick) und (2) Laufzeit-Caching
// statischer Assets für schnellere Wiederbesuche. BEWUSST KEIN Offline-Modus:
// HTML-Navigationen, RSC-Payloads, /api-Requests und Server-Actions werden vom
// fetch-Handler NICHT angefasst und gehen immer direkt ans Netz — nur
// unveränderliche/statische Dateien werden gecacht (siehe unten).

// Cache-Name mit Versions-Suffix: Ein Bump entfernt beim nächsten activate alle
// älteren neo-archive-asset-Caches. Muss nicht pro Deploy erhöht werden — die
// Build-Assets unter /_next/static/ sind content-gehasht (neuer Deploy = neue
// Dateinamen = automatischer Cache-Miss); die Version dient nur dem gelegent-
// lichen Aufräumen verwaister Einträge.
const ASSET_CACHE = "neo-archive-assets-v1";

self.addEventListener("install", () => {
  // Kein Precaching — rein laufzeitbasiert. Sofort aktiv werden.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Alte Asset-Cache-Versionen entfernen.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) => k.startsWith("neo-archive-assets-") && k !== ASSET_CACHE,
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ── Laufzeit-Caching (nur GET, nur same-origin, nur statische Assets) ──────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Range-Requests (Teilinhalte) nicht cachen — Cache-API liefert dafür keine
  // gültigen 206-Antworten.
  if (req.headers.has("range")) return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Content-gehashte Build-Assets (JS/CSS/Fonts unter /_next/static/) sind
  // unveränderlich → cache-first, ohne Ablauf.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Statische Icons, Web-App-Manifest und lokale Schriften → stale-while-
  // revalidate: sofort aus dem Cache, im Hintergrund aktualisieren.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:woff2?|ttf|otf|png|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Alles andere (HTML, RSC, /api, Server-Actions) NICHT anfassen → Netz.
});

async function cacheFirst(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  const fetching = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetching;
}

// ── Web Push (unverändert) ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Neo Archive", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const win of windows) {
          if (win.url === url && "focus" in win) {
            return win.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
