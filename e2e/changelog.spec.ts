import { test, expect } from "@playwright/test";

// Die öffentliche Änderungsliste (/changelog) braucht keine Datenbank — die
// Einträge sind code-gepflegt (src/lib/changelog.ts). Geprüft wird die
// Bedienung, die sie sich mit der Dashboard-Box teilt: Filter nach Kategorie
// und Sortierung.

test.describe("Changelog", () => {
  test("bietet je vorkommender Kategorie einen Filter, „Alle“ ist aktiv", async ({
    page,
  }) => {
    await page.goto("/changelog");
    const chips = page.locator(".changelog-chip");
    // „Alle“ plus mindestens eine Kategorie.
    expect(await chips.count()).toBeGreaterThan(2);
    await expect(chips.first()).toHaveText("Alle");
    await expect(chips.first()).toHaveAttribute("aria-pressed", "true");
  });

  test("filtert auf eine Kategorie und kommt darüber wieder zurück", async ({
    page,
  }) => {
    await page.goto("/changelog");
    // Eine Version = ein Akkordeon; .lcars-data-row ist nur dessen Kopfzeile,
    // der Inhalt steht daneben im Panel.
    const rows = page.locator("article .lcars-accordion");
    const before = await rows.count();

    const chip = page.locator(".changelog-chip", { hasText: "Export & Druck" });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");

    // Weniger Versionen als vorher — und in den übrigen steht ausschließlich
    // die gewählte Kategorie.
    await expect.poll(() => rows.count()).toBeLessThan(before);
    const tags = await page.locator(".changelog-tag").allInnerTexts();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags.map((t) => t.trim()))).toEqual(
      new Set(["EXPORT & DRUCK"]),
    );

    await page.locator(".changelog-chip", { hasText: "Alle" }).click();
    await expect.poll(() => rows.count()).toBe(before);
  });

  test("kehrt die Reihenfolge der Versionen um", async ({ page }) => {
    await page.goto("/changelog");
    const first = page.locator("article .lcars-accordion").first();
    const newest = await first.innerText();

    // Zweiter Klick auf den aktiven Sortier-Knopf dreht die Richtung.
    await page.locator(".changelog-sort button", { hasText: "VERSION" }).click();
    await expect.poll(async () => (await first.innerText()) !== newest).toBe(
      true,
    );
  });

  test("sortiert die Stichpunkte einer Version nach Kategorie", async ({
    page,
  }) => {
    await page.goto("/changelog");
    // Die offene (neueste) Version zeigt ihre Stichpunkte in gepflegter
    // Reihenfolge — gemischte Kategorien.
    // textContent statt innerText: die Etiketten der zugeklappten Versionen
    // stehen zwar im DOM, liefern als innerText aber nur Leerstrings.
    const tagsOf = () =>
      page
        .locator("article .lcars-accordion")
        .first()
        .locator(".changelog-tag")
        .evaluateAll((nodes) =>
          nodes.map((n) => (n.textContent ?? "").trim()),
        );
    const before = await tagsOf();
    expect(new Set(before).size).toBeGreaterThan(1);

    await page
      .locator(".changelog-sort button", { hasText: "KATEGORIE" })
      .click();

    // Danach stehen gleiche Kategorien beieinander: die Anzahl der Wechsel
    // von einer Kategorie zur nächsten entspricht der Anzahl Kategorien - 1.
    await expect
      .poll(async () => {
        const after = await tagsOf();
        const wechsel = after.filter((t, i) => i > 0 && t !== after[i - 1]).length;
        return wechsel === new Set(after).size - 1;
      })
      .toBe(true);
  });
});
