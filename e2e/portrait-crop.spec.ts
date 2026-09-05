import { test, expect, type Page } from "@playwright/test";

// Der Zuschnitt-Editor für Portraits. Die echte Stammdaten-Seite braucht
// Login und Datenbank — die Komponente selbst ist reine Client-Logik und
// steht deshalb in der Galerie unter #portrait-picker.

// Ein 200 × 100 großes PNG: quer, also genau der Fall, für den es den
// Editor gibt (der Bildkasten des Bogens ist hochkant).
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAA00lEQVR42u3SMQ0AQAjAQEQg4kUgGxHIegsMjJecgqYx9eBcSICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2PBaqyshnPGwlgYC2OpgLEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbFg5QMaZHf8PB0HyQAAAABJRU5ErkJggg==";

async function openEditor(page: Page) {
  await page.goto("/dev-gallery");
  const section = page.locator("#portrait-picker");
  await expect(section).toBeVisible();

  const open = section.getByRole("button", { name: "Ausschnitt wählen" });
  // Ohne Bild gibt es nichts zuzuschneiden.
  await expect(open).toBeDisabled();

  await section.locator('input[type="file"]').setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  });
  await expect(open).toBeEnabled();
  await open.click();

  const dialog = page.getByRole("dialog", { name: "Bildausschnitt wählen" });
  await expect(dialog).toBeVisible();
  // Erst wenn das Bild wirklich geladen ist, kann die Leinwand daraus
  // zeichnen — sonst schlüge „Übernehmen“ mit einer Meldung fehl.
  await expect
    .poll(() =>
      dialog
        .locator(".portrait-crop-image")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(200);
  return { section, dialog };
}

test.describe("Portrait-Zuschnitt", () => {
  test("der Regler vergrößert die Vorschau", async ({ page }) => {
    const { dialog } = await openEditor(page);
    const image = dialog.locator(".portrait-crop-image");

    await expect(image).toHaveAttribute("style", /scale\(1\)/);
    await dialog.locator('input[type="range"]').fill("2");

    await expect(dialog.getByText("Vergrößerung · 2.0×")).toBeVisible();
    await expect(image).toHaveAttribute("style", /scale\(2\)/);
  });

  test("Ziehen verschiebt den Ausschnitt und „Übernehmen“ nimmt ihn mit", async ({
    page,
  }) => {
    const { section, dialog } = await openEditor(page);
    await dialog.locator('input[type="range"]').fill("2");

    const box = await dialog.locator(".portrait-crop-box").boundingBox();
    expect(box).not.toBeNull();
    const centerX = box!.x + box!.width / 2;
    const centerY = box!.y + box!.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    // Nach unten ziehen heißt: den Ausschnitt nach oben schieben.
    await page.mouse.move(centerX, centerY + box!.height / 4, { steps: 8 });
    await page.mouse.up();

    await dialog.getByRole("button", { name: "Übernehmen" }).click();
    await expect(dialog).toBeHidden();

    const cropped = section.locator('input[name="portraitCropped"]');
    await expect(cropped).toHaveValue(/^data:image\/jpeg;base64,/);

    const setting = JSON.parse(
      await section.locator('input[name="portraitCrop"]').inputValue(),
    );
    expect(setting.zoom).toBe(2);
    expect(setting.y).toBeLessThan(50);
    // Quer verschoben wurde nicht.
    expect(setting.x).toBe(50);

    // Eine hochgeladene Datei ist selbst das Original — es gibt keine
    // Adresse, die der Server sich merken könnte.
    await expect(section.locator('input[name="portraitSource"]')).toHaveValue(
      "",
    );

    // Die Vorschau zeigt ab jetzt das Ergebnis.
    await expect(section.locator(".portrait-picker-thumb")).toHaveAttribute(
      "src",
      /^data:image\/jpeg;base64,/,
    );
  });

  test("„Zuschnitt verwerfen“ räumt das Ergebnis wieder weg", async ({
    page,
  }) => {
    const { section, dialog } = await openEditor(page);
    await dialog.getByRole("button", { name: "Übernehmen" }).click();

    const cropped = section.locator('input[name="portraitCropped"]');
    await expect(cropped).not.toHaveValue("");

    await section.getByRole("button", { name: "Zuschnitt verwerfen" }).click();
    await expect(cropped).toHaveValue("");
    await expect(section.locator('input[name="portraitCrop"]')).toHaveValue("");
  });

  test("„Abbrechen“ übernimmt nichts", async ({ page }) => {
    const { section, dialog } = await openEditor(page);
    await dialog.locator('input[type="range"]').fill("3");
    await dialog.getByRole("button", { name: "Abbrechen" }).last().click();

    await expect(dialog).toBeHidden();
    await expect(
      section.locator('input[name="portraitCropped"]'),
    ).toHaveValue("");
  });
});
