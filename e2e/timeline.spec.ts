import { test, expect } from "@playwright/test";

// Die Chronologie (/chronologie). Geprüft auf /dev-gallery, weil die echte
// Seite Datenbank UND Sichtbarkeit des Betrachters braucht — gerendert wird
// dort dieselbe Komponente mit vier Attrappen-Ereignissen über zwei Jahre.
test.describe("Chronologie", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#timeline .timeline-event").first()).toBeVisible();
  });

  test("zeigt jedes Ereignis mit Datum, Punkt und Karte", async ({ page }) => {
    const timeline = page.locator("#timeline");
    await expect(timeline.locator(".timeline-event")).toHaveCount(4);
    await expect(timeline.locator(".timeline-dot")).toHaveCount(4);
    await expect(timeline.locator(".mission-akte")).toHaveCount(4);
  });

  test("sortiert absteigend und dreht auf Klick um", async ({ page }) => {
    const titles = () =>
      page.locator("#timeline .mission-akte-title").allTextContents();
    const desc = await titles();
    expect(desc[0]).toContain("Zwischenfall");
    expect(desc[desc.length - 1]).toContain("Tuvok geboren");

    await page.locator("#timeline .mission-sort button").first().click();
    const asc = await titles();
    expect(asc[0]).toContain("Tuvok geboren");
  });

  test("trennt die Monate mit einer Zwischenüberschrift", async ({ page }) => {
    const periods = page.locator("#timeline .timeline-period");
    // 2401 · März und 2364 · Mai.
    await expect(periods).toHaveCount(2);
    await expect(periods.first()).toContainText("2401");
  });

  test("bietet je Jahr einen Knopf und schränkt darauf ein", async ({
    page,
  }) => {
    const years = page.locator("#timeline .timeline-year");
    // „Alle" plus die beiden Jahre.
    await expect(years).toHaveCount(3);

    await years.filter({ hasText: "2364" }).click();
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);

    // Ein zweiter Klick auf dasselbe Jahr hebt den Filter wieder auf.
    await years.filter({ hasText: "2364" }).click();
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(4);
  });

  test("filtert über die Suche in Titel, Text und Beteiligten", async ({
    page,
  }) => {
    const input = page.locator("#timeline input[type=search], #timeline input");
    await input.first().fill("kira");
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);
    await expect(page.locator("#timeline .mission-akte-title")).toContainText(
      "Erste Mission",
    );
  });

  test("filtert nach Ereignisart", async ({ page }) => {
    await page
      .locator("#timeline select")
      .selectOption({ label: "Konflikt" });
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);
  });

  test("kennzeichnet, was nicht aus den gepflegten Angaben stammt", async ({
    page,
  }) => {
    // Eine gepflegte Angabe ist der Normalfall und braucht keinen Hinweis;
    // „im Text markiert" und „aus dem Text abgeleitet" schränken ein und
    // stehen deshalb an der Karte.
    const timeline = page.locator("#timeline");
    await expect(timeline).toContainText("im Text markiert");
    await expect(timeline).toContainText("aus dem Text abgeleitet");
  });

  test("nennt die Zahl der angezeigten Ereignisse", async ({ page }) => {
    await expect(page.locator("#timeline")).toContainText("4 Ereignisse");
    await page.locator("#timeline .timeline-year").filter({ hasText: "2364" }).click();
    await expect(page.locator("#timeline")).toContainText("1 von 4");
  });

  test("verlinkt eine im Text markierte Stelle auf ihre Sprungmarke", async ({
    page,
  }) => {
    // Der Marker erzeugt im gerenderten Text ein <span id="timeline-N">
    // (remarkTimelineAnchors) — die Karte muss genau dorthin führen.
    const link = page
      .locator("#timeline .mission-akte")
      .filter({ hasText: "Erstkontakt" });
    await expect(link).toHaveAttribute("href", /#timeline-1$/);
  });
});
