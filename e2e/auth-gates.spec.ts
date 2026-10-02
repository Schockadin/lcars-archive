import { test, expect } from "@playwright/test";

// Die Kernflows der Angemeldeten lassen sich in der E2E-Umgebung nicht
// durchspielen (kein Login, keine Datenbank — siehe DATABASE_URL-Dummy in
// .github/workflows/ci.yml). Prüfbar ist aber ihre wichtigste Eigenschaft:
// dass sie ohne Konto gar nicht erst rendern. Genau das ist die Regression,
// die weh täte — eine Seite, die ihr Gate verliert, gibt fremde Daten preis.
const GESCHUETZT = [
  "/willkommen",
  "/user",
  "/user/characters",
  "/user/characters/new",
  "/user/content",
  "/user/import",
  "/user/mission-logs/new",
  "/user/dialogues/new",
  "/user/rules",
  "/user/rules/focuses",
  "/user/rules/talents",
  "/gm",
  "/gm/gruppe",
  "/gm/sessions",
  "/gm/sessions/1",
  "/gm/talents",
  "/gm/focuses",
  "/gm/rules",
  "/gm/chronologie",
  "/admin",
];

for (const pfad of GESCHUETZT) {
  test(`${pfad} rendert ohne Anmeldung nicht`, async ({ page }) => {
    const response = await page.goto(pfad, { waitUntil: "domcontentloaded" });
    // Entweder Weiterleitung zur Anmeldung oder klare Abweisung — nur nicht
    // die Seite selbst. Seiten, die ihre statische Hülle zuerst ausliefern
    // und den kontoabhängigen Teil nachstreamen (z.B. /willkommen, siehe die
    // Suspense-Grenze dort), antworten zunächst mit 200. Im Dev-Modus kann
    // Nexts Cache-Components-Validierung den Redirect im Suspense-Bereich als
    // abgebrochenen Prefetch behandeln und die statische Hülle stehen lassen.
    // In diesem Fall ist entscheidend, dass kein geschützter Seiteninhalt
    // gerendert wird.
    if ((response?.status() ?? 200) >= 400) return;
    try {
      await page.waitForURL(/\/login/, { timeout: 1_000 });
      return;
    } catch {
      // Die Prüfung der Fail-Closed-Hülle folgt unten.
    }
    await expect(page.locator("main h1")).toHaveCount(0);
    await expect(page.locator("main form")).toHaveCount(0);
  });
}

// Die Missionsakte bündelt einen ganzen Missionsverlauf in einer
// weiterreichbaren Datei und ist deshalb ebenfalls kontogebunden.
test("/api/export/mission-book gibt Gästen kein PDF", async ({ page }) => {
  const response = await page.goto("/api/export/mission-book/erste-mission");
  const type = response?.headers()["content-type"] ?? "";
  expect(type).not.toContain("application/pdf");
});
