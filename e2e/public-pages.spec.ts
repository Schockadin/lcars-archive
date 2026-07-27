import { test, expect } from "@playwright/test";

// Smoke-Test für öffentliche, DB-unabhängige Seiten (bzw. /search, das nur
// für anonyme Besucher ohne DB-Query auskommt — siehe DATABASE_URL-Dummy in
// der CI-Konfiguration): jede Seite muss 200 liefern und eine sichtbare
// <h1> zeigen, an beiden Viewport-Projects (mobile/desktop).
const PAGES = [
  { path: "/login", heading: "Login" },
  { path: "/changelog", heading: "Changelog" },
  { path: "/tutorial", heading: "Tutorial" },
  { path: "/impressum", heading: "Impressum" },
  { path: "/datenschutz", heading: "Datenschutzerklärung" },
  { path: "/search", heading: "Suche" },
];

for (const { path, heading } of PAGES) {
  test(`${path} returns 200 and shows its heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });
}

test("/tutorial shows the dedicated Gespräche section", async ({ page }) => {
  await page.goto("/tutorial");
  // Die Tutorial-Abschnitte sind Akkordeons (Inhalt eingeklappt), ihre
  // Kopfzeilen-Labels sind aber immer sichtbar — verifiziert, dass der
  // ausgelagerte „Gespräche"-Abschnitt vorhanden ist.
  await expect(
    page.getByText("Gespräche", { exact: true }).first(),
  ).toBeVisible();
});

test("/search form stacks vertically on mobile (no horizontal overflow)", async ({
  page,
}) => {
  await page.goto("/search");
  const form = page.locator("form[action='/search']");
  const input = form.locator("input[name='q']");
  const button = form.locator("button[type='submit']");

  const inputBox = await input.boundingBox();
  const buttonBox = await button.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth < 640) {
    // sm-Breakpoint (Tailwind): darunter flex-col, Button unter dem Input.
    expect(buttonBox!.y).toBeGreaterThanOrEqual(
      inputBox!.y + inputBox!.height - 1,
    );
  } else {
    expect(Math.abs(inputBox!.y - buttonBox!.y)).toBeLessThan(5);
  }

  const bodyOverflowX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(bodyOverflowX).toBe(false);
});
