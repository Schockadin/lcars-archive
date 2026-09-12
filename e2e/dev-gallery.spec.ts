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

// Der gemeinsame Kopf der Content-Detailseiten. Die echten Seiten
// (/chronologie/mission/…, /archive/…, /characters/dialogues/…) brauchen eine
// Datenbank, die es in der E2E-Umgebung bewusst nicht gibt — geprüft wird
// deshalb am Galerie-Abschnitt, dass Titel, Beschriftungen und Chips die
// gemeinsamen Klassen tragen und sichtbar sind.
test.describe("ContentDetailHeader", () => {
  test("zeigt Titel, beschriftete Metazeilen und Chips", async ({ page }) => {
    await page.goto("/dev-gallery");
    const header = page.locator("#content-detail-header .archive-entry-head");

    await expect(header.locator("h1.char-file-name")).toHaveText(
      "Zwischenfall auf Deneb IV",
    );
    await expect(header.locator(".archive-dialogue-label")).toHaveText([
      "Status",
      "Zeitraum",
      "Teilnehmer",
    ]);
    // Drei Teilnehmer-Chips plus der Status-Chip.
    await expect(header.locator(".archive-chip")).toHaveCount(4);
  });

  test("verlinkt nur die Chips, die ein Ziel haben", async ({ page }) => {
    await page.goto("/dev-gallery");
    const header = page.locator("#content-detail-header .archive-entry-head");

    await expect(header.locator("a.archive-chip")).toHaveCount(2);
    // Status und der nicht aufgelöste Teilnehmer bleiben statisch.
    await expect(header.locator(".archive-chip-static")).toHaveCount(2);
  });
});

// Die Logbuch-Übersicht einer Mission lag früher als schmale Schiene neben dem
// Text und war die einzige Übersicht der App außerhalb des gemeinsamen
// Listen-Systems. Geprüft wird, dass sie jetzt dieselbe Zeile und Karte trägt
// wie Chronologie und Datenbank.
test.describe("MissionLogOverview", () => {
  test("nutzt Zeile und Karte des gemeinsamen Listen-Systems", async ({
    page,
  }) => {
    await page.goto("/dev-gallery");
    const list = page.locator("#mission-log-overview");

    await expect(list.locator(".timeline-event")).toHaveCount(3);
    await expect(list.locator(".timeline-card")).toHaveCount(3);
    // Die alten Balken-Zeilen kommen hier nicht mehr vor.
    await expect(list.locator(".mission-log-entry")).toHaveCount(0);
  });

  test("gruppiert auf Wunsch nach Autor", async ({ page }) => {
    await page.goto("/dev-gallery");
    const list = page.locator("#mission-log-overview");

    await expect(list.locator(".timeline-period")).toHaveCount(0);
    await list.getByRole("button", { name: /Autor/ }).click();
    await expect(list.locator(".timeline-period")).toHaveCount(2);
  });
});
