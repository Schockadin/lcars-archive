import { test, expect } from "@playwright/test";

// Der Kalender-Knopf in der Werkzeugleiste der Content-Textfelder
// (TimelineMarkerButton.tsx). Geprüft auf /dev-gallery, weil die echten
// Formulare (Charakter, Mission, Logbuch, Datenbank-Eintrag) Anmeldung und
// Datenbank brauchen — dort steht derselbe Editor mit demselben Knopf.

const KNOPF = "Zeitleisten-Ereignis einfügen";

// Auf /dev-gallery steht derselbe Knopf auch im Charakter-Assistenten (dort
// im ausgeblendeten Biografie-Schritt) — deshalb wird jeder Zugriff auf den
// Abschnitt des Editors eingegrenzt.
const kalenderKnopf = (page: import("@playwright/test").Page) =>
  page.locator("#markdown-editor").getByRole("button", { name: KNOPF });

test.describe("Zeitleisten-Marke einfügen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#demo-markdown")).toBeVisible();
  });

  test("steht in der Werkzeugleiste des Editors", async ({ page }) => {
    await expect(kalenderKnopf(page)).toBeVisible();
  });

  test("öffnet ein Fenster mit Datum, Ereignisart und Titel", async ({
    page,
  }) => {
    await kalenderKnopf(page).click();

    const fenster = page.getByRole("dialog", { name: "Zeitleisten-Ereignis" });
    await expect(fenster).toBeVisible();
    await expect(fenster.getByLabel("Datum")).toHaveAttribute("type", "date");
    await expect(fenster.getByLabel("Titel")).toHaveAttribute("type", "text");

    // Die Ereignisart ist ein Auswahlfeld aus den Kategorien der Chronologie
    // (EVENT_CATEGORIES) — kein Freitext.
    const art = fenster.getByLabel("Ereignisart");
    await expect(art).toHaveValue("other");
    await expect(art.locator("option")).toHaveText([
      "Mission",
      "Logbuch",
      "Entdeckung",
      "Konflikt",
      "Politik",
      "Person",
      "Gespräch",
      "Sonstiges",
    ]);
  });

  test("schreibt die Marke in den Text und schließt das Fenster", async ({
    page,
  }) => {
    await kalenderKnopf(page).click();

    const fenster = page.getByRole("dialog", { name: "Zeitleisten-Ereignis" });
    await fenster.getByLabel("Datum").fill("2401-03-14");
    await fenster.getByLabel("Titel").fill("Erstkontakt");
    await fenster.getByLabel("Ereignisart").selectOption("discovery");
    await fenster.getByRole("button", { name: "Einfügen" }).click();

    await expect(fenster).toBeHidden();
    await expect(page.locator("#demo-markdown")).toHaveValue(
      /<!-- timeline: 2401-03-14 \| Erstkontakt \| discovery -->/,
    );
  });

  test("schließt sich mit Escape, ohne etwas zu schreiben", async ({ page }) => {
    const vorher = await page.locator("#demo-markdown").inputValue();

    await kalenderKnopf(page).click();
    const fenster = page.getByRole("dialog", { name: "Zeitleisten-Ereignis" });
    await expect(fenster).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(fenster).toBeHidden();
    await expect(page.locator("#demo-markdown")).toHaveValue(vorher);
  });
});
