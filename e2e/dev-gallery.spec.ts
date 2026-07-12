import { test, expect } from "@playwright/test";

// Regressionstest für den Switch-Gap/Divider-Bug: zwei benachbarte
// Switch-Optionen dürfen keine sichtbare Lücke zwischen sich haben (z.B.
// durch ein versehentlich wieder eingefügtes gap-[10px] auf
// .lcars-switch-group) und müssen exakt gleich breit sein (flex-1).
test.describe("Switch layout", () => {
  test("two-option switch has no gap between adjacent buttons", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    const buttons = page.locator("#switch-two button");
    await expect(buttons).toHaveCount(2);

    const first = await buttons.nth(0).boundingBox();
    const second = await buttons.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    expect(Math.abs(first!.x + first!.width - second!.x)).toBeLessThan(1);
    // Bis zu 1px Differenz ist normales Sub-Pixel-Rounding bei nicht
    // glatt teilbaren Containerbreiten, keine Lücke/kein Layout-Bug.
    expect(Math.abs(first!.width - second!.width)).toBeLessThanOrEqual(1);
  });

  test("five-option switch divides its width evenly with no gaps", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    const buttons = page.locator("#switch-five button");
    await expect(buttons).toHaveCount(5);

    const boxes = await Promise.all(
      Array.from({ length: 5 }, (_, i) => buttons.nth(i).boundingBox()),
    );

    for (let i = 0; i < boxes.length - 1; i++) {
      const current = boxes[i]!;
      const next = boxes[i + 1]!;
      expect(Math.abs(current.x + current.width - next.x)).toBeLessThan(1);
      expect(Math.abs(current.width - next.width)).toBeLessThanOrEqual(1);
    }
  });

  test("clicking a switch option updates its pressed state", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    const optionB = page.locator("#switch-two button", { hasText: "Option B" });

    await expect(optionB).toHaveAttribute("aria-pressed", "false");
    await optionB.click();
    await expect(optionB).toHaveAttribute("aria-pressed", "true");
  });
});
