import { test, expect } from "@playwright/test";

// Die Missions-Übersicht trägt dieselbe Zeitstrahl-Schiene wie die
// Chronologie: Datum, Linie mit Punkt, Karte. Vorher stand dort eine
// dekorative Jahres-Schiene mit zwei farbigen Kappen — die Regression, die
// weh täte, wäre eine Liste, die ihre Schiene wieder verliert oder eine
// zweite bekommt.
//
// Geprüft wird an der Galerie (#missions), weil die echte Seite eine
// Datenbank braucht, die es in der E2E-Umgebung nicht gibt.

test.describe("Missions-Übersicht", () => {
  test("stellt jede Mission an die Schiene der Chronologie", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    const rows = page.locator("#missions .timeline-event");
    await expect(rows).toHaveCount(2);

    // Datum links, Punkt an der Linie, Akte rechts.
    await expect(rows.first().locator(".timeline-date")).toHaveText("12.06.2401");
    await expect(rows.first().locator(".timeline-dot")).toHaveCount(1);
    await expect(rows.first().locator(".mission-akte")).toHaveCount(1);

    // Neueste zuerst — die Vorgabe der Sortierung.
    await expect(rows.nth(1).locator(".timeline-date")).toHaveText("05.03.2401");
  });

  test("hat die alte Jahres-Schiene nicht mehr", async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#missions .mission-rail")).toHaveCount(0);
    await expect(page.locator("#missions .mission-chronik")).toHaveCount(0);
  });

  test("färbt den Punkt nach dem Status der Mission", async ({ page }) => {
    await page.goto("/dev-gallery");
    const dots = page.locator("#missions .timeline-dot");
    const colors = await dots.evaluateAll((nodes) =>
      nodes.map((n) => getComputedStyle(n).borderTopColor),
    );
    expect(colors).toHaveLength(2);
    // „Aktiv" und „Abgeschlossen" tragen verschiedene LCARS-Akzente.
    expect(colors[0]).not.toBe(colors[1]);
  });

  test("behält Schiene und Punkt, wenn die Datumsspalte schmal wegfällt", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/dev-gallery");
    const first = page.locator("#missions .timeline-event").first();
    await expect(first.locator(".timeline-date")).toBeHidden();
    await expect(first.locator(".timeline-dot")).toBeVisible();
    // Das Datum steht weiterhin in der Karte.
    await expect(first.locator(".mission-akte")).toContainText("12.06.2401");
  });
});
