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
      page.locator("#character-wizard ol button").first(),
    ).toHaveAttribute("aria-current", "step");
  });

  test("zeigt vier Schritte und startet bei den Stammdaten", async ({
    page,
  }) => {
    const steps = page.locator(
      "#character-wizard ol[aria-label='Schritte'] button",
    );
    await expect(steps).toHaveCount(4);
    // Die Beschriftung steht im aria-label, weil sie auf schmalen Geräten
    // ausgeblendet wird (Icon-Knöpfe) — dort wäre sonst nichts mehr zu
    // unterscheiden.
    for (const [index, label] of [
      "Stammdaten",
      "Werte",
      "Biografie",
      "Vorschau",
    ].entries()) {
      await expect(steps.nth(index)).toHaveAttribute(
        "aria-label",
        `Schritt ${index + 1}: ${label}`,
      );
      await expect(steps.nth(index).locator("svg")).toHaveCount(1);
    }

    // Nur der aktive Schritt ist sichtbar — die übrigen bleiben im DOM
    // (hidden), damit Eingaben beim Blättern nicht verloren gehen.
    await expect(page.locator("#wizard-name")).toBeVisible();
    await expect(page.locator("#wizard-stats-attr-control")).toBeHidden();
  });

  test("zeigt die Blätter-Knöpfe oben neben der Schrittleiste und unten", async ({
    page,
  }) => {
    // Auf den langen Schritten (Werte, Biografie) liegt der untere Knopf weit
    // unterhalb des Bildschirms — deshalb steht dieselbe Gruppe zusätzlich
    // oben in der Kopfzeile.
    const navs = page.locator("#character-wizard .wizard-nav");
    await expect(navs).toHaveCount(2);
    await expect(
      page.locator("#character-wizard .wizard-bar .wizard-nav"),
    ).toHaveCount(1);

    // Beide Kopien blättern dieselbe Form: der obere „Weiter"-Knopf bringt
    // den Assistenten genauso auf Schritt 2 wie der untere.
    await page.locator("#wizard-name").fill("T'Rel");
    await page
      .locator("#character-wizard .wizard-bar button[aria-label='Weiter']")
      .click();
    await expect(page.locator("#wizard-stats-attr-control")).toBeVisible();
    await navs.last().locator("button[aria-label='Zurück']").click();
    await expect(page.locator("#wizard-name")).toBeVisible();
  });

  test("blättert erst mit Namen weiter", async ({ page }) => {
    await page
      .locator("#character-wizard .wizard-bar button[aria-label='Weiter']")
      .click();
    await expect(
      page.getByText("Bitte zuerst einen Namen angeben."),
    ).toBeVisible();
    await expect(page.locator("#wizard-name")).toBeVisible();
  });

  test("behält Eingaben beim Vor- und Zurückblättern", async ({ page }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page
      .locator("#character-wizard .wizard-bar button[aria-label='Weiter']")
      .click();

    const control = page.locator("#wizard-stats-attr-control");
    await expect(control).toBeVisible();
    await control.fill("11");

    // Zurück zu den Stammdaten …
    await page
      .locator("#character-wizard .wizard-bar button[aria-label='Zurück']")
      .click();
    await expect(page.locator("#wizard-name")).toHaveValue("T'Rel");

    // … und wieder vor: der Wert im zweiten Schritt steht noch.
    await page.locator("#character-wizard ol button").nth(1).click();
    await expect(control).toHaveValue("11");
  });

  test("zeigt im Werte-Schritt die Erschaffungsbudgets prominent an", async ({
    page,
  }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page.locator("#character-wizard ol button").nth(1).click();

    // Je ein Budget-Block direkt unter der Kopfleiste des Abschnitts, den er
    // betrifft (DEFAULT_ADVANCEMENT_RULES: je 320 AP).
    const attributes = page.locator("#character-wizard .stat-budget").nth(0);
    await expect(page.locator("#character-wizard .stat-budget")).toHaveCount(2);
    await expect(attributes).toContainText("0 / 320 AP verbraucht");
    await expect(attributes.locator(".stat-budget-figure")).toContainText(
      "320",
    );
    await expect(attributes.locator(".stat-budget-figure")).toContainText(
      "AP übrig",
    );

    // Ein verteilter Wert schlägt sofort auf Zahl und Balken durch:
    // Kontrolle von 7 auf 11 kostet (1+2+3+4) × 10 = 100 AP.
    await page.locator("#wizard-stats-attr-control").fill("11");
    await expect(attributes).toContainText("100 / 320 AP verbraucht");
    await expect(attributes.locator(".stat-budget-figure")).toContainText(
      "220",
    );
    await expect(attributes).not.toHaveClass(/stat-budget--over/);
  });

  test("markiert ein überzogenes Budget", async ({ page }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page.locator("#character-wizard ol button").nth(1).click();

    // Eine Disziplin von 1 auf 4 kostet (2+3+4) × 10 = 90 AP. Drei davon
    // bleiben mit 270 im Budget …
    const departments = page.locator("#character-wizard .stat-budget").nth(1);
    for (const key of ["command", "conn", "security"]) {
      await page.locator(`#wizard-stats-dep-${key}`).fill("4");
    }
    await expect(departments).toContainText("270 / 320 AP verbraucht");
    await expect(departments).not.toHaveClass(/stat-budget--over/);

    // … die vierte sprengt es (360 AP): der Block wechselt in den
    // Warnzustand und zählt die Überziehung.
    await page.locator("#wizard-stats-dep-engineering").fill("4");
    await expect(departments).toHaveClass(/stat-budget--over/);
    await expect(departments).toContainText("360 / 320 AP verbraucht");
    await expect(departments.locator(".stat-budget-figure")).toContainText(
      "40",
    );
    await expect(departments).toContainText("AP zu viel");
  });

  test("zeigt im letzten Schritt die drei Blätter mit den Eingaben", async ({
    page,
  }) => {
    await page.locator("#wizard-name").fill("T'Rel");
    await page.locator("#wizard-rank").fill("Lieutenant");
    await page.locator("#character-wizard ol button").nth(3).click();

    const preview = page.locator("#character-wizard .pf-preview");
    await expect(preview).toBeVisible();
    // Blatt 1 Personalakte, Blatt 2 Spickzettel, Blatt 3 Biografie. Die
    // Blattnamen stehen im Titelreiter der STA-Kopfzeile (.pf-doc-tab).
    await expect(preview.locator(".pf-doc-tab")).toHaveText([
      "Cheat Sheet",
      "Biography",
    ]);
    // Beide Zusatzblätter tragen die Aufmachung des Hauptblatts.
    await expect(preview.locator(".pf-doc-wordmark")).toHaveCount(2);
    await expect(preview.getByText("T'Rel").first()).toBeVisible();
    await expect(
      page.locator("#character-wizard .wizard-bar button[type='submit']"),
    ).toBeVisible();
  });
});

// Die Schrittleiste ist auf schmalen Geräten reine Icon-Leiste (Breakpoint
// 520px in character-stats.css) — hier geprüft an den beiden Viewports, die
// playwright.config.ts ohnehin fährt (mobile 375px, desktop 1280px).
test.describe("Breite auf schmalen Geräten", () => {
  test("Assistent läuft in jedem Schritt ohne Querscrollen", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width > 520, "nur im mobilen Projekt");
    await page.goto("/dev-gallery");
    await expect(
      page.locator("#character-wizard ol button").first(),
    ).toHaveAttribute("aria-current", "step");
    await page.locator("#wizard-name").fill("T'Rel");

    for (const step of [0, 1, 2, 3]) {
      await page.locator("#character-wizard ol button").nth(step).click();
      const overflowing = await page.evaluate(() => {
        const doc = document.documentElement;
        return [...document.querySelectorAll("#character-wizard *")].filter(
          (el) =>
            !el.closest("[hidden]") &&
            el.getBoundingClientRect().right > doc.clientWidth + 1,
        ).length;
      });
      expect(overflowing, `Schritt ${step + 1}`).toBe(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(
        await page.evaluate(() => document.documentElement.clientWidth),
      );
    }
  });

  test("Schrittleiste zeigt mobil nur die Icons", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width > 520, "nur im mobilen Projekt");
    await page.goto("/dev-gallery");
    const first = page.locator("#character-wizard ol button").first();
    await expect(first).toHaveAttribute("aria-current", "step");

    // Alle vier Schritte plus die Blätter-Knöpfe stehen nebeneinander in
    // einer Zeile, statt umzubrechen.
    const tops = await page
      .locator("#character-wizard ol button")
      .evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().top)),
      );
    expect(new Set(tops).size).toBe(1);

    // Icon ja, sichtbare Beschriftung nein (sie bleibt im aria-label).
    // Geprüft an der Fläche statt über toBeHidden: die Beschriftung wird
    // per clip-path weggeschnitten und bleibt damit für Screenreader
    // lesbar — für Playwright ist so ein Element weiterhin „visible".
    await expect(first.locator("svg")).toBeVisible();
    const labelBox = await first.locator(".wizard-step-label").boundingBox();
    expect(labelBox?.width ?? 0).toBeLessThanOrEqual(1);
    const buttonBox = await first.boundingBox();
    expect(buttonBox?.width ?? 0).toBeLessThanOrEqual(48);
  });

  test("Schrittleiste zeigt auf dem Desktop die Beschriftung", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width <= 520, "nur im Desktop-Projekt");
    await page.goto("/dev-gallery");
    const first = page.locator("#character-wizard ol button").first();
    await expect(first).toHaveAttribute("aria-current", "step");
    await expect(first.locator(".wizard-step-label")).toHaveText(
      "1. Stammdaten",
    );
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
    // Alle drei Blätter stehen im Fenster — die Blattnamen im Titelreiter
    // der STA-Kopfzeile (.pf-doc-tab).
    await expect(overlay.locator(".pf-doc-tab")).toHaveText([
      "Cheat Sheet",
      "Biography",
    ]);
    // Der Spickzettel führt neben den Talenten die Kernregeln (Momentum,
    // Bedrohung, Entschlossenheit) — siehe src/lib/coreRules.ts.
    await expect(
      overlay.locator(".pf-doc-heading", { hasText: "MOMENTUM AUSGEBEN" }),
    ).toBeVisible();
    await expect(overlay.locator(".pf-doc-rule")).toHaveCount(15);
    await expect(overlay.locator(".pf-doc-wordmark")).toHaveCount(2);

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
