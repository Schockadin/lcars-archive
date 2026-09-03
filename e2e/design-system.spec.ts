import { test, expect } from "@playwright/test";

// Regressionsschutz für die geteilten Design-System-Bausteine. Diese Klassen
// wurden aus mehrfach vorhandenen, leicht abweichenden Regeln zusammengeführt
// (siehe src/styles/lcars-components/shared.css). Geprüft wird am computed
// style eingehängter Elemente auf einer DB-freien Seite — so schlägt der Test
// an, sobald eine Domänen-Datei die geteilte Regel versehentlich wieder
// überschreibt oder die Import-Reihenfolge kippt.

async function computed(
  page: import("@playwright/test").Page,
  className: string,
  props: string[],
): Promise<Record<string, string>> {
  return page.evaluate(
    ([cls, keys]) => {
      const el = document.createElement("div");
      el.className = cls;
      document.body.appendChild(el);
      const style = getComputedStyle(el);
      const out: Record<string, string> = {};
      for (const k of keys) out[k] = style.getPropertyValue(k);
      el.remove();
      return out;
    },
    [className, props] as const,
  );
}

test(".lcars-split ist das gemeinsame Zwei-Spalten-Layout", async ({ page }) => {
  await page.goto("/tutorial");
  const s = await computed(page, "lcars-split", [
    "display",
    "gap",
    "align-items",
    "width",
  ]);
  expect(s.display).toBe("flex");
  expect(s.gap).toBe("24px");
  expect(s["align-items"]).toBe("flex-start");
});

test(".lcars-toolbar ist die gemeinsame Listen-Toolbar", async ({ page }) => {
  await page.goto("/tutorial");
  const s = await computed(page, "lcars-toolbar", [
    "display",
    "flex-wrap",
    "align-items",
    "gap",
  ]);
  expect(s.display).toBe("flex");
  expect(s["flex-wrap"]).toBe("wrap");
  expect(s.gap).toBe("12px");
});

// Meta-/Nebentext trug vorher in fünf Dateien elf gleichlautende Regeln, teils
// mit 11px, teils mit 12px. Jetzt eine Rolle, eine Größe.
test("Meta-Text ist überall dieselbe Rolle", async ({ page }) => {
  await page.goto("/tutorial");
  const classes = [
    "lcars-meta-text",
    "lcars-meta-row",
    "mission-logs-sub",
    "news-row-meta",
    "lcars-search-sub",
    "stat-budget-spent",
  ];
  const seen: Record<string, string>[] = [];
  for (const cls of classes) {
    seen.push(await computed(page, cls, ["font-size", "color", "font-family"]));
  }
  for (const s of seen) {
    expect(s["font-size"]).toBe("12px");
    expect(s["font-family"]).toContain("Share Tech Mono");
    expect(s.color).toBe(seen[0].color);
  }
});
