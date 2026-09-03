import { test, expect } from "@playwright/test";

// Der Anlege-Assistent (/user/characters/new) und die Bogen-Vorschau sind
// reine Client-Logik — Schritt-Navigation, Erhalt der Eingaben beim Blättern,
// Budget-Anzeige, Overlay. Geprüft wird auf /dev-gallery statt auf der echten
// Seite: die braucht Login UND Datenbank, die in der E2E-Umgebung bewusst
// nicht existiert (siehe DATABASE_URL-Dummy in .github/workflows/ci.yml).
// Gerendert wird dort dieselbe Komponente mit Attrappen-Daten, die Prüfungen
// treffen also den echten Assistenten.
test.describe("Charakter-Assistent", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    // Client-Hydration abwarten: vor ihr reagiert kein Schritt-Knopf.
    await expect(
      page.locator("#character-wizard button", { hasText: "1. Stammdaten" }),
    ).toHaveAttribute("aria-current", "step");
  });

  test("zeigt vier Schritte und startet bei den Stammdaten", async ({
    page,
  }) => {
    const steps = page.locator("#character-wizard ol[aria-label='Schritte'] button");
    await expect(steps).toHaveCount(4);
    await expect(steps).toHaveText([
      "1. Stammdaten",
      "2. Werte",
      "3. Biografie",
      "4. Vorschau",
    ]);

    // Nur der aktive Schritt ist sichtbar — die übrigen bleiben im DOM
    // (hidden), damit Eingaben beim Blättern nicht verloren gehen.
    await expect(page.locator("#wizard-name")).toBeVisible();
    await expect(page.locator("#wizard-stats-attr-control")).toBeHidden();
  });

  test("blättert erst mit Namen weiter", async ({ page }) => {
    await page.locator("#character-wizard button", { hasText: "Weiter" }).click();
    await expect(
      page.getByText("Bitte zuerst einen Namen angeben."),
    ).toBeVisible();
    await expect(page.locator("#wizard-name")).toBeVisible();
  });

  test("behält Eingaben beim Vor- und Zurückblättern", async ({ page }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page.locator("#character-wizard button", { hasText: "Weiter" }).click();

    const control = page.locator("#wizard-stats-attr-control");
    await expect(control).toBeVisible();
    await control.fill("11");

    // Zurück zu den Stammdaten …
    await page.locator("#character-wizard button", { hasText: "Zurück" }).click();
    await expect(page.locator("#wizard-name")).toHaveValue("T'Rel");

    // … und wieder vor: der Wert im zweiten Schritt steht noch.
    await page
      .locator("#character-wizard button", { hasText: "2. Werte" })
      .click();
    await expect(control).toHaveValue("11");
  });

  test("zeigt im Werte-Schritt die Erschaffungsbudgets", async ({ page }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page
      .locator("#character-wizard button", { hasText: "2. Werte" })
      .click();

    // Ohne verteilte Werte kostet nichts — die Anzeige nennt trotzdem beide
    // Budgets aus dem Regelwerk (DEFAULT_ADVANCEMENT_RULES: 320 AP).
    await expect(page.getByText(/Attribute: \d+ \/ 320 AP/)).toBeVisible();
    await expect(page.getByText(/Disziplinen: \d+ \/ 320 AP/)).toBeVisible();
  });

  test("zeigt im letzten Schritt die drei Blätter mit den Eingaben", async ({
    page,
  }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page.locator("#wizard-rank").fill("Lieutenant");
    await page
      .locator("#character-wizard button", { hasText: "4. Vorschau" })
      .click();

    const preview = page.locator("#character-wizard .pf-preview");
    await expect(preview).toBeVisible();
    // Blatt 1 Personalakte, Blatt 2 Spickzettel, Blatt 3 Biografie.
    await expect(preview.locator(".pf-doc-title")).toHaveText([
      "Talents",
      "Biography",
    ]);
    await expect(preview.getByText("T'Rel").first()).toBeVisible();
    await expect(
      page.locator("#character-wizard button", { hasText: "Fertig" }),
    ).toBeVisible();
  });
});

test.describe("Bogen-Vorschau", () => {
  test("öffnet das Vorschau-Fenster mit Drucken und Speichern", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    await page.locator("#open-sheet-preview").click();

    const overlay = page.locator(".pf-preview-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay.getByLabel("Bogen drucken")).toBeVisible();
    await expect(overlay.getByLabel("Bogen als PDF speichern")).toHaveAttribute(
      "download",
      "",
    );
    // Alle drei Blätter stehen im Fenster.
    await expect(overlay.locator(".pf-doc-title")).toHaveText([
      "Talents",
      "Biography",
    ]);

    // Escape schließt (useOverlayDismiss) — gleiches Muster wie die übrigen
    // Overlays der Anwendung.
    await page.keyboard.press("Escape");
    await expect(overlay).toHaveCount(0);
  });

  test("schließt über den Schließen-Knopf", async ({ page }) => {
    await page.goto("/dev-gallery");
    await page.locator("#open-sheet-preview").click();
    const overlay = page.locator(".pf-preview-overlay");
    await expect(overlay).toBeVisible();
    await overlay.getByLabel("Vorschau schließen").click();
    await expect(overlay).toHaveCount(0);
  });
});
