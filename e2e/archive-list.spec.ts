import { test, expect } from "@playwright/test";

// Die Datenbank (/archive). Geprüft auf /dev-gallery, weil die echte Seite
// Datenbank UND Sichtbarkeit des Betrachters braucht — gerendert wird dort
// dieselbe Komponente mit drei Attrappen-Einträgen aus drei Kategorien.
//
// Der Punkt dieser Datei: die Datenbank trägt seit der Zusammenlegung
// dieselbe Zeile und dieselbe Karte wie die Chronologie (ChronoRow /
// ChronoCard) — nur ohne Datumsspalte und mit einem Kategorie-Etikett
// anstelle des Art-Etiketts.

test.describe("Datenbank", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(
      page.locator("#archive-list .timeline-event").first(),
    ).toBeVisible();
  });

  test("zeigt jeden Eintrag in der Zeile der Chronologie, ohne Datumsspalte", async ({
    page,
  }) => {
    const liste = page.locator("#archive-list");
    await expect(liste.locator(".timeline-event")).toHaveCount(3);
    await expect(liste.locator(".timeline-dot")).toHaveCount(3);
    // Die Schiene bleibt, die Datumsspalte entfällt.
    await expect(liste.locator(".timeline-date")).toHaveCount(0);
    await expect(liste.locator(".timeline-event-undated")).toHaveCount(3);
    await expect(liste).toContainText("3 Einträge");
  });

  test("trägt je Karte das Etikett seiner Kategorie", async ({ page }) => {
    const etiketten = page.locator("#archive-list .timeline-card .timeline-tag");
    await expect(etiketten).toHaveText(["Ort", "Fraktion", "NPC"]);
  });

  test("färbt die Karte in der Farbe ihrer Kategorie", async ({ page }) => {
    const farben = await page
      .locator("#archive-list .timeline-card")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).backgroundColor),
      );
    // Ort und Fraktion tragen verschiedene Farben, und keine Karte bleibt
    // auf der Grundfläche stehen.
    expect(new Set(farben).size).toBeGreaterThan(1);
    for (const farbe of farben) {
      expect(farbe).not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("führt ein Klick irgendwo auf der Karte zum Eintrag", async ({ page }) => {
    const karte = page.locator("#archive-list .timeline-card").first();
    await karte.scrollIntoViewIfNeeded();
    // Weit neben dem Titel geklickt — per Maus-Koordinate, weil Playwright
    // sonst meldet, dass der Titel-Link die Klicks abfängt. Genau das ist ja
    // der Zweck: die unsichtbare Fläche liegt über der ganzen Karte (siehe
    // .timeline-card-title::after).
    const box = (await karte.boundingBox())!;
    // Geprüft wird die ANFRAGE, nicht die Zielseite: die Datenbank-Seite
    // braucht die Datenbank, die es auf /dev-gallery nicht gibt.
    const angefragt = page.waitForRequest((request) =>
      request.url().includes("/archive/andor"),
    );
    await page.mouse.click(box.x + box.width - 20, box.y + box.height / 2);
    expect((await angefragt).url()).toContain("/archive/andor");
  });

  test("grenzt die Liste über die Suche ein", async ({ page }) => {
    const liste = page.locator("#archive-list");
    await liste.locator('input[aria-label="Einträge filtern"]').fill("andor");
    await expect(liste.locator(".timeline-card-title")).toHaveText(["Andor"]);
    await expect(liste).toContainText("1 von 3 Einträgen");
  });

  test("filtert nach Kategorie", async ({ page }) => {
    const liste = page.locator("#archive-list");
    await liste
      .locator('select[aria-label="Nach Kategorie filtern"]')
      .selectOption("npc");
    await expect(liste.locator(".timeline-card-title")).toHaveText([
      "Thy'lek Shran",
    ]);
  });

  test("gruppiert alphabetisch und dreht auf Klick um", async ({ page }) => {
    const liste = page.locator("#archive-list");
    const buchstaben = () =>
      liste.locator(".archive-letter-period").allTextContents();
    expect(await buchstaben()).toEqual(["A", "O", "T"]);

    await liste.getByText("Alphabetisch").click();
    expect(await buchstaben()).toEqual(["T", "O", "A"]);
  });
});
