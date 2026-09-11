import { test, expect } from "@playwright/test";

// Die öffentliche Änderungsliste (/changelog) braucht keine Datenbank — die
// Einträge sind code-gepflegt (src/lib/changelog.ts). Geprüft wird die
// Bedienung, die sie sich mit der Dashboard-Box teilt: Filter nach Kategorie
// und Sortierung.

test.describe("Changelog", () => {
  test("führt jede vorkommende Kategorie im Auswahlfeld, „Alle“ ist gewählt", async ({
    page,
  }) => {
    await page.goto("/changelog");
    const filter = page.locator(".changelog-filter");
    const options = await filter.locator("option").allInnerTexts();
    // „Alle Kategorien“ plus mindestens zwei Kategorien.
    expect(options.length).toBeGreaterThan(2);
    expect(options[0]).toBe("Alle Kategorien");
    await expect(filter).toHaveValue("");
  });

  test("filtert auf eine Kategorie und kommt darüber wieder zurück", async ({
    page,
  }) => {
    await page.goto("/changelog");
    // Eine Version = ein Akkordeon; .lcars-data-row ist nur dessen Kopfzeile,
    // der Inhalt steht daneben im Panel.
    const rows = page.locator("article .lcars-accordion");
    const before = await rows.count();

    const filter = page.locator(".changelog-filter");
    await filter.selectOption("export");

    // Weniger Versionen als vorher — und in den übrigen steht ausschließlich
    // die gewählte Kategorie.
    await expect.poll(() => rows.count()).toBeLessThan(before);
    const tags = await page.locator(".changelog-tag").allInnerTexts();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags.map((t) => t.trim()))).toEqual(
      new Set(["EXPORT & DRUCK"]),
    );

    await filter.selectOption("");
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
    // textContent statt innerText: die Etiketten der zugeklappten Versionen
    // stehen zwar im DOM, liefern als innerText aber nur Leerstrings.
    const versionen = page.locator("article .lcars-accordion");
    const tagsVon = (index: number) =>
      versionen
        .nth(index)
        .locator(".changelog-tag")
        .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? "").trim()));

    // Zeigen lässt sich die Sortierung nur an einer Version, die überhaupt
    // mehrere Kategorien mischt. Welche das ist, hängt am gepflegten Inhalt
    // von src/lib/changelog.ts — deshalb die erste passende SUCHEN statt
    // die neueste anzunehmen: Eine Version darf ohne Weiteres nur eine
    // einzige Kategorie haben (1.30 etwa besteht nur aus „Konto &
    // Sicherheit"), und daran soll dieser Test nicht scheitern.
    const anzahl = await versionen.count();
    let index = -1;
    let before: string[] = [];
    for (let i = 0; i < anzahl; i++) {
      const tags = await tagsVon(i);
      if (new Set(tags).size > 1) {
        index = i;
        before = tags;
        break;
      }
    }
    // Gäbe es im ganzen Changelog keine solche Version, prüfte der Test
    // nichts mehr — dann soll er laut scheitern statt still durchzulaufen.
    expect(
      index,
      "keine Version mit gemischten Kategorien im Changelog",
    ).toBeGreaterThanOrEqual(0);
    expect(new Set(before).size).toBeGreaterThan(1);

    await page
      .locator(".changelog-sort button", { hasText: "KATEGORIE" })
      .click();

    // Die Sortierung ordnet nur INNERHALB einer Version um (siehe
    // useChangelogView), die Versionsreihenfolge bleibt — derselbe Index
    // zeigt danach also auf dieselbe Version.
    //
    // Danach stehen gleiche Kategorien beieinander: die Anzahl der Wechsel
    // von einer Kategorie zur nächsten entspricht der Anzahl Kategorien - 1.
    await expect
      .poll(async () => {
        const after = await tagsVon(index);
        const wechsel = after.filter((t, i) => i > 0 && t !== after[i - 1]).length;
        return wechsel === new Set(after).size - 1;
      })
      .toBe(true);
  });
});
