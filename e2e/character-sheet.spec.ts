import { test, expect } from "@playwright/test";

// Der Charakterbogen als Ansicht (PersonnelFileView) — geprüft auf
// /dev-gallery statt auf /characters/[slug]/sheet: die echte Seite braucht
// Login UND Datenbank, die in der E2E-Umgebung bewusst nicht existiert (siehe
// DATABASE_URL-Dummy in .github/workflows/ci.yml). Gerendert wird dort
// dieselbe Komponente mit Attrappen-Daten.
//
// Der Bogen und sein PDF (src/lib/pdf/CharacterSheetPdfDocument.tsx) sollen
// 1:1 gleich aussehen. Das PDF lässt sich hier nicht rastern, wohl aber die
// Seite des Bogens festhalten, aus der das PDF abgeleitet ist: Zahl und Größe
// der Kästchen, Schrift ohne Sperrung, Portraitkasten.
test.describe("Charakterbogen (Ansicht)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#personnel-file .pf-sheet")).toBeVisible();
  });

  test("hat 19 Stress- und 3 Entschlossenheits-Kästchen", async ({ page }) => {
    const sheet = page.locator("#personnel-file");
    await expect(
      sheet.locator(".pf-check:not(.pf-check--determination)"),
    ).toHaveCount(19);
    await expect(sheet.locator(".pf-check--determination")).toHaveCount(3);
  });

  test("zeigt genau so viele Entschlossenheits-Kästchen als gesetzt, wie der Charakter hat", async ({
    page,
  }) => {
    const boxes = page.locator("#personnel-file .pf-check--determination");
    await expect(boxes.nth(0)).toHaveAttribute("aria-checked", "true");
    await expect(boxes.nth(1)).toHaveAttribute("aria-checked", "true");
    await expect(boxes.nth(2)).toHaveAttribute("aria-checked", "false");
  });

  test("blendet die Stress-Kästchen jenseits des Maximums ab", async ({
    page,
  }) => {
    // Fitness 9 ⇒ maximaler Stress 9: die ersten neun Kästchen stehen voll da,
    // der Rest blass (.pf-check--out).
    const sheet = page.locator("#personnel-file");
    await expect(sheet.locator(".pf-check--out")).toHaveCount(10);
  });

  test("setzt die Kästchen nicht als native Checkbox um", async ({ page }) => {
    // Ein deaktiviertes <input type=checkbox> malt Chromium grau statt in der
    // Akzentfarbe — das PDF könnte das nie treffen. Deshalb eigene Kästchen.
    await expect(
      page.locator("#personnel-file input[type=checkbox]"),
    ).toHaveCount(0);
    await expect(
      page.locator("#personnel-file [role=checkbox]").first(),
    ).toBeVisible();
  });

  test("schreibt ohne die Sperrung des LCARS-Fließtexts", async ({ page }) => {
    // body { letter-spacing: 0.05em } kam als feste 0,8px im Bogen an: der
    // Text war dadurch am Bildschirm 17 % breiter als im PDF.
    const spacing = await page
      .locator("#personnel-file .pf-static")
      .first()
      .evaluate((el) => getComputedStyle(el).letterSpacing);
    expect(spacing).toBe("normal");
  });

  test("skaliert alle Maße mit dem Blatt (--pf-unit)", async ({ page }) => {
    const sizes = await page.locator("#personnel-file .pf-sheet").evaluate(
      (sheet) => {
        const box = sheet.getBoundingClientRect();
        const check = sheet
          .querySelector(".pf-check:not(.pf-check--determination)")!
          .getBoundingClientRect();
        return { sheetWidth: box.width, checkWidth: check.width };
      },
    );
    // Ein Stress-Kästchen ist 20 von 816 Blatt-Einheiten breit.
    expect(sizes.checkWidth / sizes.sheetWidth).toBeCloseTo(20 / 816, 3);
  });

  test("hält das Seitenverhältnis des Bogens (816 × 1056)", async ({ page }) => {
    const box = await page.locator("#personnel-file .pf-sheet").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width / box!.height).toBeCloseTo(816 / 1056, 2);
  });
});
