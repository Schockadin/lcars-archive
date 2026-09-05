import { test, expect } from "@playwright/test";

// Der Beziehungsgraph (/characters/beziehungen). Geprüft auf /dev-gallery,
// weil die echte Seite Datenbank UND Sichtbarkeit des Betrachters braucht —
// gerendert wird dort dieselbe Komponente mit einem kleinen Attrappen-Graph
// (drei Figuren, zwei Kanten).
test.describe("Beziehungsgraph", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#relation-graph svg")).toBeVisible();
  });

  test("zeichnet je Figur einen Knoten und je Verbindung eine Linie", async ({
    page,
  }) => {
    const graph = page.locator("#relation-graph");
    await expect(graph.locator("svg circle")).toHaveCount(3);
    await expect(graph.locator("svg line")).toHaveCount(2);
  });

  test("schreibt keine NaN-Koordinaten ins SVG", async ({ page }) => {
    // Kanten auf unbekannte Knoten hatten früher NaN-Koordinaten erzeugt.
    const nans = await page.locator("#relation-graph svg").evaluate((svg) => {
      let count = 0;
      for (const el of svg.querySelectorAll("*")) {
        for (const attr of el.getAttributeNames()) {
          if ((el.getAttribute(attr) ?? "").includes("NaN")) count++;
        }
      }
      return count;
    });
    expect(nans).toBe(0);
  });

  test("zeichnet die stärkere Verbindung dicker", async ({ page }) => {
    const widths = await page
      .locator("#relation-graph svg line")
      .evaluateAll((lines) =>
        lines.map((l) => parseFloat(l.getAttribute("stroke-width") ?? "0")),
      );
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths));
  });

  test("hält jeden Namen im sichtbaren Bereich des Bildes", async ({ page }) => {
    // „Barkeeper Quark" lief mit festem Rand am linken Kreisrand aus dem Bild.
    const overflow = await page.locator("#relation-graph svg").evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      return [...svg.querySelectorAll("text")].filter((t) => {
        const b = t.getBoundingClientRect();
        return b.left < box.left - 0.5 || b.right > box.right + 0.5;
      }).length;
    });
    expect(overflow).toBe(0);
  });

  test("nennt den Graph für Screenreader und bietet dieselben Namen als Liste", async ({
    page,
  }) => {
    await expect(page.locator("#relation-graph svg")).toHaveAttribute(
      "role",
      "img",
    );
    const names = page.locator("#relation-graph");
    await expect(names).toContainText("Barkeeper Quark");
  });
});
