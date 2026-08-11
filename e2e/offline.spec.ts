import { test, expect } from "@playwright/test";

// End-to-End-Test der Offline-PWA-Infrastruktur (siehe public/sw.js +
// ServiceWorkerRegister.tsx): Beim Laden einer Seite muss der Service Worker
// registriert und aktiv werden UND die Offline-Ausweichseite (/offline) als
// gültige Antwort ins Precache legen. Genau diese Verdrahtung liefert im
// Offline-Fall den Fallback statt eines Browser-Netzfehlers.
//
// Bewusst NICHT getestet: das tatsächliche Offline-Ausliefern über
// context.setOffline(true). Playwrights Offline-Emulation blockiert den
// eigenen fetch()-Aufruf des Service Workers gegen den Dev-Server (`next dev`,
// die e2e-Webserver-Basis) nicht zuverlässig — die Navigation erreicht dann
// doch den Server, statt in den Cache-Fallback zu laufen. Der reale
// Offline-Betrieb greift im Produktions-Build; hier wird die dafür nötige,
// deterministisch prüfbare Verdrahtung abgesichert.
//
// Läuft nur im desktop-Project (Service-Worker-Verhalten ist viewport-
// unabhängig).
test.describe("offline PWA", () => {
  test("registers a service worker that precaches a valid offline page", async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== "chromium", "Service Worker nur in Chromium");
    test.skip(
      testInfo.project.name !== "desktop",
      "nur einmal (desktop) — Service Worker ist viewport-unabhängig",
    );

    await page.goto("/login");

    // Service Worker wird aktiv UND kontrolliert diese Seite (activate ruft
    // self.clients.claim() auf).
    await page.waitForFunction(
      async () => {
        if (!("serviceWorker" in navigator)) return false;
        await navigator.serviceWorker.ready;
        return navigator.serviceWorker.controller !== null;
      },
      undefined,
      { timeout: 20_000 },
    );

    // Die Offline-Ausweichseite liegt als gültige Antwort im Precache (Status
    // 200 mit der erwarteten Offline-Überschrift) — nicht bloß irgendein
    // Cache-Eintrag.
    const offline = await page.waitForFunction(
      async () => {
        for (const key of await caches.keys()) {
          const cache = await caches.open(key);
          const res = await cache.match("/offline");
          if (res) {
            const body = await res.text();
            return { status: res.status, hasHeading: body.includes("<h1>Offline</h1>") };
          }
        }
        return null;
      },
      undefined,
      { timeout: 20_000 },
    );

    const result = await offline.jsonValue();
    expect(result).toEqual({ status: 200, hasHeading: true });
  });
});
