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
  "/user/mission-logs/new",
  "/user/dialogues/new",
  "/gm",
  "/gm/talents",
  "/gm/focuses",
  "/gm/rules",
  "/gm/chronologie",
  "/admin",
];

for (const pfad of GESCHUETZT) {
  test(`${pfad} rendert ohne Anmeldung nicht`, async ({ page }) => {
    const response = await page.goto(pfad);
    // Entweder Weiterleitung zur Anmeldung oder klare Abweisung — nur nicht
    // die Seite selbst. Seiten, die ihre statische Hülle zuerst ausliefern
    // und den kontoabhängigen Teil nachstreamen (z.B. /willkommen, siehe die
    // Suspense-Grenze dort), antworten dabei zunächst mit 200 und leiten erst
    // danach um — deshalb auf die Adresse warten statt sie sofort zu lesen.
    if ((response?.status() ?? 200) >= 400) return;
    await expect(page).toHaveURL(/\/login/);
  });
}

// Die Missionsakte bündelt einen ganzen Missionsverlauf in einer
// weiterreichbaren Datei und ist deshalb ebenfalls kontogebunden.
test("/api/export/mission-book gibt Gästen kein PDF", async ({ page }) => {
  const response = await page.goto("/api/export/mission-book/erste-mission");
  const type = response?.headers()["content-type"] ?? "";
  expect(type).not.toContain("application/pdf");
});
