import { test, expect } from "@playwright/test";

// Die aufklappbaren Abschnitte (SettingsPanel) und der Markdown-Editor —
// beides trägt inzwischen Notizen, Versionen, „Erwähnt in", „Wer kennt wen"
// und die Farbauswahl. Geprüft auf /dev-gallery, weil alle echten Fundorte
// Login und Datenbank brauchen.
test.describe("SettingsPanel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#settings-panel details").first()).toBeVisible();
  });

  test("ist zugeklappt und öffnet auf Klick", async ({ page }) => {
    const panel = page.locator("#settings-panel details").first();
    await expect(panel).not.toHaveAttribute("open", /.*/);
    await panel.locator("summary").click();
    await expect(panel).toHaveAttribute("open", /.*/);
  });

  test("stellt gestapelt Titel und Kurzinfo untereinander", async ({ page }) => {
    // In breiten Panels stand die Kurzinfo sonst am äußersten rechten Rand,
    // hunderte Pixel von dem Titel entfernt, zu dem sie gehört.
    const rows = page.locator("#settings-panel details");
    const flat = await rows.nth(0).locator("summary > *").first().boundingBox();
    const stackedBox = await rows
      .nth(1)
      .locator("summary")
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(flat).not.toBeNull();
    expect(stackedBox).toBe("column");
  });

  test("lässt die nebeneinander stehende Kopfzeile eine Zeile bleiben", async ({
    page,
  }) => {
    const dir = await page
      .locator("#settings-panel details")
      .nth(0)
      .locator("summary")
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(dir).toBe("row");
  });
});

test.describe("Markdown-Editor", () => {
  test("ist so hoch wie angefordert (rows)", async ({ page }) => {
    await page.goto("/dev-gallery");
    const textarea = page.locator("#markdown-editor textarea").first();
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("rows", "10");
  });

  test("bietet eine Werkzeugleiste und einen Vorschau-Umschalter", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    const buttons = page.locator("#markdown-editor button");
    expect(await buttons.count()).toBeGreaterThan(3);
  });
});
