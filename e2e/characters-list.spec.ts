import { test, expect } from "@playwright/test";

// Die Charakterliste (/characters). Geprüft auf /dev-gallery, weil die echte
// Seite die Datenbank braucht — gerendert wird dort dieselbe Komponente mit
// drei Attrappen-Figuren, je eine pro Status.
//
// Der Punkt dieser Datei: die Liste trägt seit der Zusammenlegung dieselbe
// Zeile und Karte wie Chronologie und Datenbank (ChronoRow/ChronoCard), nur
// steht über jeder Gruppe der Status statt eines Monats oder Buchstabens.

test.describe("Charakterliste", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(
      page.locator("#character-list .timeline-event").first(),
    ).toBeVisible();
  });

  test("zeigt jede Figur in der Zeile der Chronologie, ohne Datumsspalte", async ({
    page,
  }) => {
    const liste = page.locator("#character-list");
    await expect(liste.locator(".timeline-event")).toHaveCount(3);
    await expect(liste.locator(".timeline-dot")).toHaveCount(3);
    await expect(liste.locator(".timeline-date")).toHaveCount(0);
    await expect(liste).toContainText("3 Charaktere");
  });

  test("beschriftet die Gruppen mit dem Status", async ({ page }) => {
    await expect(
      page.locator("#character-list .timeline-period"),
    ).toHaveText(["Aktiv", "Inaktiv", "Verstorben"]);
  });

  test("trägt das Rang-Kürzel als Etikett", async ({ page }) => {
    await expect(
      page.locator("#character-list .timeline-tag"),
    ).toHaveText(["LTC", "CDR"]);
  });

  test("gruppiert auf Wunsch nach Generation", async ({ page }) => {
    const liste = page.locator("#character-list");
    await liste.getByText("Generation", { exact: true }).click();
    await expect(liste.locator(".timeline-period")).toHaveText([
      "Erste Generation",
      "Zweite Generation",
    ]);
  });

  test("grenzt über das Filterfeld ein", async ({ page }) => {
    const liste = page.locator("#character-list");
    await liste.locator('input[aria-label="Charaktere filtern"]').fill("tuvok");
    await expect(liste.locator(".timeline-card-title")).toHaveText(["Tuvok"]);
    await expect(liste).toContainText("1 von 3 Charakteren");
  });

  test("zeigt ein Vorschaubild nur bei Figuren mit Bild", async ({ page }) => {
    const liste = page.locator("#character-list");
    // Von den drei Attrappen hat genau eine ein Bild (siehe DEMO_CHARACTERS
    // in dev-gallery/page.tsx) — die beiden anderen bekommen KEINEN
    // Platzhalter, sondern gar kein Element.
    await expect(liste.locator("img.timeline-card-thumb")).toHaveCount(1);
    await expect(liste.locator(".timeline-card")).toHaveCount(3);
  });

  test("führt zum Anlegen eines Charakters", async ({ page }) => {
    await expect(
      page.locator('#character-list a[aria-label="Charakter anlegen"]'),
    ).toHaveAttribute("href", "/user/characters/new");
  });

  test("führt ein Klick irgendwo auf der Karte zur Personalakte", async ({
    page,
  }) => {
    const karte = page.locator("#character-list .timeline-card").first();
    await karte.scrollIntoViewIfNeeded();
    // Weit neben dem Titel geklickt — per Maus-Koordinate, weil Playwright
    // sonst meldet, dass der Titel-Link die Klicks abfängt. Genau das ist ja
    // der Zweck: die unsichtbare Fläche liegt über der ganzen Karte (siehe
    // .timeline-card-title::after).
    const box = (await karte.boundingBox())!;
    // Geprüft wird die ANFRAGE, nicht die Zielseite: die Personalakte braucht
    // die Datenbank, die es auf /dev-gallery nicht gibt.
    const angefragt = page.waitForRequest((request) =>
      request.url().includes("/characters/tuvok"),
    );
    await page.mouse.click(box.x + box.width - 20, box.y + box.height / 2);
    expect((await angefragt).url()).toContain("/characters/tuvok");
  });
});
