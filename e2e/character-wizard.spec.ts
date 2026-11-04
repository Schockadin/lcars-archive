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
      page.getByRole("tab", { name: "Werte" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("zeigt die vier Standard-Tabs und startet bei den Werten", async ({
    page,
  }) => {
    const steps = page.locator(
      "#character-wizard [role='tablist'] button[role='tab']",
    );
    await expect(steps).toHaveCount(4);
    for (const [index, label] of [
      "Werte",
      "Persönliche Daten",
      "Biografie",
      "Dateien",
    ].entries()) {
      await expect(steps.nth(index)).toHaveText(label);
    }

    await expect(steps.first()).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#wizard-stats-attr-control")).toBeVisible();
    await expect(page.locator("#wizard-name")).toBeHidden();
  });

  test("zeigt die Tab-Navigation oben und unten", async ({
    page,
  }) => {
    const navs = page.locator("#character-wizard .wizard-nav");
    await expect(navs).toHaveCount(2);

    await navs.first().getByRole("button", { name: "Zum nächsten Tab" }).click();
    await expect(page.locator("#wizard-name")).toBeVisible();
    await navs.last().getByRole("button", { name: "Zum vorherigen Tab" }).click();
    await expect(page.locator("#wizard-stats-attr-control")).toBeVisible();
    await expect(page.locator("#wizard-name")).toBeHidden();
  });

  test("kann zwischen Tabs wechseln ohne Eingaben zu verlieren", async ({ page }) => {
    await page.getByRole("tab", { name: "Persönliche Daten" }).click();
    await page.locator("#wizard-name").fill("T'Rel");
    await page.getByRole("tab", { name: "Werte" }).click();
    await page.getByRole("tab", { name: "Persönliche Daten" }).click();
    await expect(page.locator("#wizard-name")).toBeVisible();
    await expect(page.locator("#wizard-name")).toHaveValue("T'Rel");
  });

  test("behält Eingaben beim Vor- und Zurückblättern", async ({ page }) => {
    await page.getByRole("tab", { name: "Persönliche Daten" }).click();
    await page.locator("#wizard-name").fill("T'Rel");
    await page.getByRole("tab", { name: "Werte" }).click();

    const control = page.locator("#wizard-stats-attr-control");
    await expect(control).toBeVisible();
    await control.fill("11");

    // Zurück zu den persönlichen Daten …
    await page.getByRole("tab", { name: "Persönliche Daten" }).click();
    await expect(page.locator("#wizard-name")).toHaveValue("T'Rel");

    // … und wieder vor: der Wert im zweiten Schritt steht noch.
    await page.getByRole("tab", { name: "Werte" }).click();
    await expect(control).toHaveValue("11");
  });

  test("zeigt im Werte-Schritt die Erschaffungsbudgets prominent an", async ({
    page,
  }) => {
    await expect(page.locator("#wizard-creation-method")).toHaveValue("ap");

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

  test("bietet das STA-2e-Punktesystem zusätzlich zur AP-Vergabe an", async ({ page }) => {
    const method = page.locator("#wizard-creation-method");
    await expect(method.locator("option")).toHaveCount(3);
    await method.selectOption("sta2e-point-buy");

    await expect(page.locator("#wizard-stats-attr-control")).toHaveValue("7");
    await expect(page.locator("#wizard-stats-dep-command")).toHaveValue("1");
    await expect(page.locator("#character-wizard .stat-budget").nth(0)).toContainText("42 / 56 Punkte verteilt");
    await expect(page.locator("#character-wizard .stat-budget").nth(1)).toContainText("6 / 16 Punkte verteilt");

    for (const [key, value] of Object.entries({
      control: "12", daring: "10", fitness: "10", insight: "9", presence: "8", reason: "7",
    })) {
      await page.locator(`#wizard-stats-attr-${key}`).fill(value);
    }
    for (const [key, value] of Object.entries({
      command: "5", conn: "4", engineering: "3", security: "2", medicine: "1", science: "1",
    })) {
      await page.locator(`#wizard-stats-dep-${key}`).fill(value);
    }

    await expect(page.getByText("Die Attributsumme muss 56 betragen")).toHaveCount(0);
    await expect(page.getByText("Die Disziplinensumme muss 16 betragen")).toHaveCount(0);
  });

  test("wählt Career Events aus der STA-2e-Tabelle und zeigt ihre Boni", async ({
    page,
  }) => {
    const firstEvent = page.locator("#wizard-stats-career-event-1");
    const secondEvent = page.locator("#wizard-stats-career-event-2");
    await expect(firstEvent.locator("option")).toHaveCount(21);
    await expect(secondEvent).toBeDisabled();

    await firstEvent.selectOption("first-contact");
    await expect(secondEvent).toBeEnabled();
    await expect(
      page.getByText(/\+1 Attribut \(Präsenz\), \+1 Disziplin \(beliebig\), 1 Fokus/),
    ).toBeVisible();
    await secondEvent.selectOption("breakthrough-or-invention");
    await expect(page.getByText(/Inventor of X/)).toBeVisible();
  });

  test("markiert ein überzogenes Budget", async ({ page }) => {
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

  test("zeigt im letzten Schritt die vier Blätter mit den Eingaben", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Persönliche Daten" }).click();
    await page.locator("#wizard-name").fill("T'Rel");
    await page.locator("#wizard-rank").fill("Lieutenant");
    await page.getByRole("tab", { name: "Dateien" }).click();

    const preview = page.locator("#character-wizard .pf-preview");
    await expect(preview).toBeVisible();
    // Blatt 1 Personalakte, Blatt 2 Spickzettel, Blatt 3 Regeln, Blatt 4
    // Biografie. Die Blattnamen stehen im Titelreiter der STA-Kopfzeile
    // (.pf-doc-tab); Blatt 1 trägt seinen Reiter in der gedruckten Grafik.
    await expect(preview.locator(".pf-doc-tab")).toHaveText([
      "Cheat Sheet",
      "Rules",
      "Biography",
    ]);
    // Alle Zusatzblätter tragen die Aufmachung des Hauptblatts.
    await expect(preview.locator(".pf-doc-wordmark")).toHaveCount(3);
    await expect(preview.getByText("T'Rel").first()).toBeVisible();
    await expect(
      page.locator("#character-wizard [role='tabpanel'] button[type='submit']"),
    ).toBeVisible();
  });
});

test.describe("Persönliche Angaben im Charakter-Assistenten", () => {
  test("übernimmt Eingaben im Standardmodus ohne Browserfehler", async ({ page }) => {
    await page.goto("/dev-gallery");

    await expect(page.locator("#wizard-creation-method")).toHaveValue("ap");
    const personalTab = page.getByRole("tab", { name: "Persönliche Daten" });
    await expect(personalTab).toHaveAttribute("aria-selected", "false");
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await personalTab.click();

    const pronouns = page.locator("#wizard-personal-pronouns");
    await pronouns.fill("they/them");
    await expect(pronouns).toHaveValue("they/them");

    const personalPanel = page.locator("#character-editor-panel-personal");
    await expect(personalPanel.locator("#wizard-personal-experience")).toHaveCount(0);
    await expect(personalPanel.locator("#wizard-personal-characterRole")).toHaveCount(0);
    await expect(personalPanel.locator("#wizard-personal-environment")).toHaveCount(0);
    await expect(personalPanel.locator("#wizard-personal-careerPath")).toHaveCount(0);
    await page.getByRole("tab", { name: "Werte" }).click();
    await expect(page.locator("#wizard-stats-characterRole")).toBeVisible();
    const experience = page.locator("#wizard-stats-experience");
    await experience.selectOption("experienced");
    await expect(experience).toHaveValue("experienced");
    expect(pageErrors).toEqual([]);
  });

  test("hält Spezies, Laufbahnauswahlen und Fähigkeiten gemeinsam im Werte-Tab", async ({ page }) => {
    await page.goto("/dev-gallery");
    const valuesPanel = page.locator("#character-editor-panel-values");
    const personalPanel = page.locator("#character-editor-panel-personal");

    await expect(valuesPanel.locator(".character-species-picker")).toBeVisible();
    await expect(valuesPanel.locator("#wizard-stats-environment")).toBeVisible();
    await expect(valuesPanel.locator("#wizard-stats-upbringing")).toBeVisible();
    await expect(valuesPanel.locator("#wizard-stats-careerPath")).toBeVisible();
    await expect(personalPanel.locator(".character-species-picker")).toHaveCount(0);

    await valuesPanel.locator(".character-species-picker summary").click();
    await valuesPanel.getByRole("checkbox", { name: "Mensch (Human)" }).check();
    await expect(valuesPanel.getByRole("checkbox", { name: /Human — Faith of the Heart/ })).toBeVisible();
  });
});

// Die Tab-Leiste und die langen Eingabebereiche bleiben auf schmalen Geräten
// innerhalb des Viewports.
test.describe("Breite auf schmalen Geräten", () => {
  test("Assistent läuft in jedem Tab ohne Querscrollen", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width > 520, "nur im mobilen Projekt");
    await page.goto("/dev-gallery");
    await expect(
      page.getByRole("tab", { name: "Werte" }),
    ).toHaveAttribute("aria-selected", "true");

    for (const label of ["Werte", "Persönliche Daten", "Biografie", "Dateien"]) {
      await page.getByRole("tab", { name: label }).click();
      const overflowing = await page.evaluate(() => {
        const doc = document.documentElement;
        return [...document.querySelectorAll("#character-wizard *")].filter(
          (el) =>
            !el.closest("[hidden]") &&
            el.getBoundingClientRect().right > doc.clientWidth + 1,
        ).length;
      });
      expect(overflowing, `Tab ${label}`).toBe(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(
        await page.evaluate(() => document.documentElement.clientWidth),
      );
    }
  });

  test("Tab-Leiste bleibt mobil lesbar und im Viewport", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width > 520, "nur im mobilen Projekt");
    await page.goto("/dev-gallery");
    const tabs = page.locator("#character-wizard [role='tablist'] [role='tab']");
    await expect(tabs).toHaveCount(4);
    await expect(tabs).toHaveText(["Werte", "Persönliche Daten", "Biografie", "Dateien"]);
    const rightEdges = await tabs.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().right),
    );
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(rightEdges.every((right) => right <= viewportWidth + 1)).toBe(true);
  });

  test("Tab-Leiste zeigt auf dem Desktop alle Beschriftungen", async ({
    page,
    viewport,
  }) => {
    test.skip(!viewport || viewport.width <= 520, "nur im Desktop-Projekt");
    await page.goto("/dev-gallery");
    const tabs = page.locator("#character-wizard [role='tablist'] [role='tab']");
    await expect(tabs).toHaveText(["Werte", "Persönliche Daten", "Biografie", "Dateien"]);
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
    // Alle vier Blätter stehen im Fenster — die Blattnamen im Titelreiter
    // der STA-Kopfzeile (.pf-doc-tab).
    await expect(overlay.locator(".pf-doc-tab")).toHaveText([
      "Cheat Sheet",
      "Rules",
      "Biography",
    ]);
    // Die Regeln stehen seit v1.29.36 auf einem eigenen Blatt, nicht mehr
    // hinter den Talenten: die Kernregeln (Momentum, Bedrohung,
    // Entschlossenheit, siehe src/lib/coreRules.ts) und dahinter die eigenen
    // Regeln der Runde (DEMO_RULES in der Galerie, in der Anwendung aus
    // campaign_rules).
    const regelblatt = overlay
      .locator(".pf-doc")
      .filter({ has: overlay.page().locator(".pf-doc-tab", { hasText: "Rules" }) });
    await expect(
      regelblatt.locator(".pf-doc-heading", { hasText: "MOMENTUM AUSGEBEN" }),
    ).toBeVisible();
    await expect(
      regelblatt.locator(".pf-doc-heading", { hasText: "EIGENE REGELN" }),
    ).toBeVisible();
    // 15 Kernregeln (coreRules.ts) + 1 Hausregel aus DEMO_RULES — alle auf
    // dem Regelblatt, keine mehr beim Spickzettel.
    await expect(overlay.locator(".pf-doc-rule")).toHaveCount(16);
    await expect(regelblatt.locator(".pf-doc-rule")).toHaveCount(16);
    await expect(overlay.locator(".pf-doc-wordmark")).toHaveCount(3);

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
