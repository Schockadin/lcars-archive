import { test, expect } from "@playwright/test";

for (const fixture of ["timeline-sessions", "mission-session-panels"]) {
  test(`${fixture}: Session-Panels lassen sich einzeln und gemeinsam bedienen`, async ({ page }) => {
    await page.goto("/dev-gallery");
    const view = page.locator(`#${fixture}`);
    const panels = view.locator("[data-session-panel]");
    await expect(panels).toHaveCount(2);
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
    const close = view.getByRole("button", { name: "Alle Session-Panels schließen" });
    const open = view.getByRole("button", { name: "Alle Session-Panels öffnen" });
    await expect(open).toHaveText("+");
    await expect(close).toHaveText("−");
    await expect(open.locator("svg")).toHaveCount(0);
    await close.click();
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(0);
    await panels.first().locator("summary").click();
    await expect(panels.first()).toHaveAttribute("open", "");
    await close.click();
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(0);
    await open.click();
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
    await panels.first().locator("summary").click();
    await expect(panels.first()).not.toHaveAttribute("open");
    await open.click();
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
    await close.click();
    await view.locator(".lcars-toc-link").first().click();
    await expect(panels.first()).toHaveAttribute("open", "");
    await expect(panels.last()).not.toHaveAttribute("open");
  });
}

test("Komplettsynopsis zeigt Datum ohne Synopsis-Präfix", async ({ page }) => {
  await page.goto("/dev-gallery");
  const synopsis = page.locator("#mission-session-panels #mission-full-synopsis");
  await expect(synopsis.getByRole("heading")).toHaveText(["Synopsis", "08.03.2401", "07.03.2401"]);
  await expect(synopsis).toContainText("Bericht vom 8. März.");
  await expect(synopsis).not.toContainText("Veraltete Fassung");
});
