import { test, expect } from "@playwright/test";

test("GM-Aktionen öffnen die Missions- und Terminformulare in Fenstern", async ({
  page,
}) => {
  await page.goto("/dev-gallery");
  const actions = page.locator("#new-content-gm-actions");

  await expect(
    actions.getByRole("button", { name: "Neue Mission" }),
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: "Termin anlegen" }),
  ).toBeVisible();
  await expect(actions.getByRole("link", { name: "Import" })).toHaveCount(0);

  await actions.getByRole("button", { name: "Neue Mission" }).click();
  const missionDialog = page.getByRole("dialog", {
    name: "Neue Mission anlegen",
  });
  await expect(missionDialog).toBeVisible();
  await expect(missionDialog.locator("form")).toBeVisible();
  await missionDialog.getByRole("button", { name: "Schließen" }).click();
  await expect(missionDialog).toHaveCount(0);

  await actions.getByRole("button", { name: "Termin anlegen" }).click();
  const sessionDialog = page.getByRole("dialog", { name: "Session planen" });
  await expect(sessionDialog).toBeVisible();
  await expect(sessionDialog.locator("form")).toBeVisible();
});
