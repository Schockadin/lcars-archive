// Service Worker: (1) Web Push (Zustellung/Klick), (2) Laufzeit-Caching
// statischer Assets für schnelle Wiederbesuche und (3) OFFLINE-BETRIEB
// (soweit möglich) für eine installierte PWA.
//
// Offline-Strategie (bewusst konservativ, da die App authentifiziert und
// personalisiert ist):
//   - Navigationen (HTML) und RSC-Payloads: network-first. Online kommt immer
//     der frische Server-Stand; die Antwort wird zusätzlich in einen Runtime-
//     Cache gelegt. Offline wird die zuletzt gesehene Version derselben URL
//     ausgeliefert; fehlt sie, die statische Offline-Ausweichseite (/offline).
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
const CACHE_VERSION = "v2";
const ASSET_CACHE = `neo-archive-assets-${CACHE_VERSION}`;
const PAGE_CACHE = `neo-archive-pages-${CACHE_VERSION}`;
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
      const current = new Set([ASSET_CACHE, PAGE_CACHE, PRECACHE]);
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

  // RSC-Payloads (React Server Components) der clientseitigen Navigation:
  // dieselbe URL wie die HTML-Seite, aber mit RSC-Header/_rsc-Query. Wie eine
  // Navigation behandeln (network-first mit Cache-Fallback), damit auch das
  // Weiterklicken zwischen bereits besuchten Seiten offline funktioniert.
  const isRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");

  // Echte Seiten-Navigationen (Adressleiste, Reload, Link ohne JS).
  const isNavigation = req.mode === "navigate";

  if (isNavigation || isRsc) {
    event.respondWith(networkFirstPage(req, isNavigation));
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

  // Alles andere (/api, Server-Actions, sonstige dynamische GETs) NICHT
  // anfassen → direkt ans Netz.
});

// Network-first für Navigationen und RSC-Payloads: online frisch (und in den
// Page-Cache gelegt), offline aus dem Page-Cache, sonst die Offline-Seite.
async function networkFirstPage(req, isNavigation) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    // Nur erfolgreiche, „basic"/„default"-Antworten cachen (keine Redirects/
    // Opaques). Eine Kopie ablegen, das Original ausliefern.
    if (res && res.ok && (res.type === "basic" || res.type === "default")) {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    // Offline: zuerst die exakt passende gecachte Version dieser URL.
    const cached = await cache.match(req);
    if (cached) return cached;
    // Für echte Navigationen die Offline-Ausweichseite; für RSC-Payloads
    // ohne Cache gibt es keinen sinnvollen Fallback → Fehler durchreichen,
    // damit der Router-Fetch scheitert (die bereits sichtbare Seite bleibt).
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
