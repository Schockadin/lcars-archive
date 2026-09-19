import { test, expect } from "@playwright/test";

// Der „Nach oben"-Knopf (ScrollTopButton.tsx). Geprüft auf /dev-gallery, weil
// die Seite lang genug zum Scrollen ist und ohne Anmeldung/Datenbank
// auskommt — der Knopf selbst steckt in der Inhaltsfläche (MainContent.tsx)
// und steht damit auf jeder Seite.

// Gescrollt wird nicht das Fenster, sondern .lcars-main-content.
const FLAECHE = ".lcars-main-content";

const knopf = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Nach oben" });

// Bis ans Ende, statt um eine feste Pixelzahl: Wie lang die Galerie ist,
// hängt an ihrem Inhalt — ans Ende kommt sie in jeder Größe.
async function scrolleAnsEnde(page: import("@playwright/test").Page) {
  await page.locator(FLAECHE).evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
}

test.describe("Nach oben", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#demo-markdown")).toBeVisible();
  });

  test("bleibt am Seitenanfang verborgen", async ({ page }) => {
    await expect(knopf(page)).toBeHidden();
  });

  test("erscheint nach dem Scrollen unten rechts", async ({ page }) => {
    await scrolleAnsEnde(page);

    await expect(knopf(page)).toBeVisible();

    // Unten rechts: in der rechten und in der unteren Hälfte der Fläche.
    const kasten = (await knopf(page).boundingBox())!;
    const flaeche = (await page.locator(FLAECHE).boundingBox())!;
    expect(kasten.x).toBeGreaterThan(flaeche.x + flaeche.width / 2);
    expect(kasten.y).toBeGreaterThan(flaeche.y + flaeche.height / 2);
  });

  test("bringt die Seite zurück an den Anfang und verschwindet dabei", async ({
    page,
  }) => {
    await scrolleAnsEnde(page);
    await knopf(page).click();

    await expect
      .poll(async () =>
        page.locator(FLAECHE).evaluate((el) => Math.round(el.scrollTop)),
      )
      .toBe(0);
    await expect(knopf(page)).toBeHidden();
  });
});
