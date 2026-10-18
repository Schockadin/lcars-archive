// Service Worker: (1) Web Push (Zustellung/Klick), (2) Cache öffentlicher
// statischer Assets und (3) eine generische Offline-Ausweichseite. Navigations-
// und RSC-Antworten werden nie persistent gespeichert, da sie private und
// authentifizierte Inhalte enthalten können.
//
// Offline-Strategie:
//   - Navigationen (HTML): immer Netz; offline nur die generische /offline-Seite.
//   - RSC-Payloads: immer Netz; offline schlägt die Navigation fehl.
//   - Content-gehashte Build-Assets (/_next/static/): cache-first, unveränder-
//     lich.
//   - Icons/Fonts/Manifest/Bilder: stale-while-revalidate.
//   - /api, Server-Actions und alle Mutationen: NICHT angefasst → immer Netz
//     (personalisierte/schreibende Endpunkte lassen sich nicht sinnvoll
//     offline bedienen; sie schlagen offline erwartungsgemäß fehl).

// Versionssuffix: Ein Bump entfernt beim nächsten activate ältere Caches.
// Build-Assets unter /_next/static/ sind content-gehasht (neuer Deploy = neue
// Dateinamen = automatischer Cache-Miss); die Version räumt verwaiste Einträge
// auf und erneuert das Precache (u.a. die Offline-Seite).
const CACHE_VERSION = "v4";
const ASSET_CACHE = `neo-archive-assets-${CACHE_VERSION}`;
const PRECACHE = `neo-archive-precache-${CACHE_VERSION}`;

// Beim Install vorgeladene, netz-unabhängige Ausweichressourcen.
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Offline-Ausweichseite + Manifest vorladen, damit die App auch beim
      // allerersten Offline-Aufruf eine gestylte Seite zeigen kann.
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
      // Sofort aktiv werden (kein Warten auf Schließen aller Tabs).
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Alte Cache-Versionen entfernen (alles, was nicht zur aktuellen
      // Version gehört).
      const keys = await caches.keys();
      const current = new Set([ASSET_CACHE, PRECACHE]);
      await Promise.all(
        keys
          .filter((k) => k.startsWith("neo-archive-") && !current.has(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ── Fetch-Routing ──────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Range-Requests (Teilinhalte) nicht cachen — die Cache-API liefert dafür
  // keine gültigen 206-Antworten.
  if (req.headers.has("range")) return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // /api NIE anfassen → immer direkt ans Netz, NICHT cachen. Wichtig auch für
  // die Sicherheit: personalisierte/private Endpunkte (z.B. der eingebettete
  // Charakterbogen /api/character-sheets/<id>, ausgeliefert als
  // "Cache-Control: private") werden als <iframe>-Quelle mit request.mode
  // "navigate" geladen und lägen sonst in der Navigations-Zweig-Logik unten im
  // Page-Cache — private Bytes dürfen dort nicht landen. Der Cache-API sind die
  // Cache-Control-Header egal, deshalb hier explizit ausschließen.
  if (url.pathname.startsWith("/api/")) return;

  // RSC-Payloads (React Server Components) und echte Navigationen enthalten
  // oft kontobezogene Inhalte. Sie bleiben ausschließlich im Netzabruf und
  // werden nie in der Cache-API abgelegt.
  const isRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");

  // Echte Seiten-Navigationen (Adressleiste, Reload, Link ohne JS).
  const isNavigation = req.mode === "navigate";

  if (isNavigation || isRsc) {
    event.respondWith(fetchPage(req, isNavigation));
    return;
  }

  // Content-gehashte Build-Assets → cache-first, ohne Ablauf.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Statische Icons, Web-App-Manifest und lokale Schriften/Bilder →
  // stale-while-revalidate: sofort aus dem Cache, im Hintergrund aktualisieren.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:woff2?|ttf|otf|png|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Alles andere (Server-Actions, sonstige dynamische GETs) NICHT anfassen →
  // direkt ans Netz. (/api ist bereits oben ausgeschlossen.)
});

// Private Seiten bleiben ausschließlich im Netz. Offline erscheint bei einer
// vollständigen Navigation die allgemeine Ausweichseite ohne Nutzerdaten.
async function fetchPage(req, isNavigation) {
  try {
    return await fetch(req);
  } catch {
    if (isNavigation) {
      const precache = await caches.open(PRECACHE);
      const offline = await precache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw new Error("Offline und keine gecachte Version verfügbar.");
  }
}

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

// Alte Page-Caches aus früheren Service-Worker-Versionen zusätzlich beim
// Login/Logout entfernen. Neue Versionen schreiben keine Seitenantworten.
self.addEventListener("message", (event) => {
  if (event.data === "neo-archive:clear-page-cache") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("neo-archive-pages-"))
            .map((key) => caches.delete(key)),
        ),
      ),
    );
  }
});

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
