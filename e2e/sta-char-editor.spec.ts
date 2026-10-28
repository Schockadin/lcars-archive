import { expect, test } from "@playwright/test";

test("serves the standalone editor from the LCARS origin", async ({ page }) => {
  await page.goto("/sta-char-editor/");
  await expect(page.getByRole("heading", { name: "Charaktere", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Jetzt synchronisieren/ })).toBeVisible();
});

test("saves a character locally while offline", async ({ page, context }) => {
  await page.goto("/sta-char-editor/");
  await expect(page.getByRole("heading", { name: "Charaktere", level: 1 })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Neuen Charakter anlegen" }).click();
  await page.locator("input[name='name']").fill("Offline Captain");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.locator(".character-card")).toContainText("Offline Captain");
  await expect(page.getByText("Änderung lokal gespeichert.")).toBeVisible();
});
