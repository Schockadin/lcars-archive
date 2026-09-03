import { test, expect } from "@playwright/test";

// Regressionsschutz für die LCARS-Schriften.
//
// Hintergrund: Die next/font-Variablen werden in layout.tsx angemeldet
// (`variable: "--font-…"`), aber ausschließlich aus dem CSS heraus per
// var() referenziert — es gibt also keine Compiler-/Typprüfung, die einen
// Tippfehler oder eine einseitige Umbenennung auffangen würde. Genau das war
// passiert: layout.tsx meldete --font-mono-lcars an, während rund 25 Regeln
// in src/styles/lcars-components/*.css var(--font-share-tech-mono) nutzen.
//
// Ein var() ohne Fallback macht die GESAMTE Deklaration ungültig ("invalid at
// computed-value time") — der `, monospace`-Teil greift dann eben NICHT, und
// alle Mono-Elemente erbten still die Fließtextschrift. Der Fehler war rein
// visuell und fiel dadurch weder Lint noch Build noch den übrigen Tests auf.
//
// Die Prüfung läuft über die computed styles eines echten Elements statt nur
// über den Variablenwert: so deckt sie auch ab, dass die Regel den Weg bis
// ans Element findet.
const FONT_VARS = [
  { name: "--font-antonio", expect: "Antonio" },
  { name: "--font-share-tech-mono", expect: "Share Tech Mono" },
];

for (const { name, expect: expected } of FONT_VARS) {
  test(`${name} ist definiert und trägt ${expected}`, async ({ page }) => {
    await page.goto("/tutorial");
    const value = await page.evaluate(
      (varName) =>
        getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim(),
      name,
    );
    expect(value).toContain(expected);
  });
}

test("Inline-Code auf /tutorial wird in der Mono-Schrift gesetzt", async ({
  page,
}) => {
  await page.goto("/tutorial");
  const code = page.locator(".tutorial-content code").first();
  await code.waitFor();
  const fontFamily = await code.evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );
  expect(fontFamily).toContain("Share Tech Mono");
});

test("DataRow-Pillen behalten die LCARS-Schrift auch im minimalistischen UI", async ({
  page,
  baseURL,
}) => {
  // neo_ui=minimal aktiviert data-ui="minimal" bereits vorm ersten Paint
  // (siehe layout.tsx) — ohne Login, da rein CSS-basiert.
  await page.context().addCookies([
    { name: "neo_ui", value: "minimal", url: baseURL },
  ]);
  // Geprüft wird — wie in content-width.spec.ts — an einem eingehängten
  // Element auf einer DB-freien Seite: die echten Pillen stehen auf
  // /archive (ArchiveCategoryNav.tsx), und /archive braucht eine Datenbank,
  // die in der E2E-Umgebung bewusst nicht existiert (siehe DATABASE_URL-
  // Dummy in .github/workflows/ci.yml). Die Regel selbst (minimal-ui.css)
  // war die Ursache und wird hier direkt am computed style geprüft.
  await page.goto("/tutorial");
  await expect(page.locator("html")).toHaveAttribute("data-ui", "minimal");

  const fontFamily = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "lcars-data-row-text";
    document.body.appendChild(el);
    const value = getComputedStyle(el).fontFamily;
    el.remove();
    return value;
  });

  expect(fontFamily).toContain("Antonio");
});

test("ohne minimalistisches UI bleibt die Pillen-Schrift die LCARS-Vorgabe", async ({
  page,
}) => {
  // Gegenprobe: Die Regel aus minimal-ui.css darf nicht die einzige Quelle
  // der Antonio-Schrift sein — im Standard-LCARS-UI trägt die Pille sie
  // ebenfalls, dort über die Vererbung vom body.
  await page.goto("/tutorial");
  await expect(page.locator("html")).not.toHaveAttribute("data-ui", "minimal");

  const fontFamily = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "lcars-data-row-text";
    document.body.appendChild(el);
    const value = getComputedStyle(el).fontFamily;
    el.remove();
    return value;
  });

  expect(fontFamily).toContain("Antonio");
});
