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
  { path: "/forgot-password", heading: "Passwort vergessen" },
  // /activate ohne Token stellt keine DB-Anfrage (peekPasswordSetupToken läuft
  // nur bei vorhandenem Token) — der Seitenkopf steht deshalb auch ohne DB.
  { path: "/activate", heading: "Passwort festlegen" },
  // Offline-Ausweichseite des Service Workers (statisch, DB-frei).
  { path: "/offline", heading: "Offline" },
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

test("/tutorial#<abschnitt> klappt den Ziel-Abschnitt automatisch auf", async ({
  page,
}) => {
  // Changelog-Deep-Links zeigen auf /tutorial#<id>; DataRowAccordion muss den
  // passenden Abschnitt beim Laden aufklappen, sonst landet man nur auf der
  // eingeklappten Kopfzeile. Der Inhalt des „Eigene Inhalte"-Abschnitts ist
  // erst nach dem Aufklappen sichtbar.
  await page.goto("/tutorial#eigene-inhalte");
  const trigger = page
    .locator("#eigene-inhalte .lcars-accordion-trigger")
    .first();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
});

test("der Changelog verlinkt in die Anleitung", async ({ page }) => {
  await page.goto("/changelog");
  const link = page
    .getByRole("link", { name: /Im Tutorial:/ })
    .first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /^\/tutorial#/);
});

test("/activate without a token shows the invalid-link hint", async ({
  page,
}) => {
  // Der Suspense-gekapselte Inhalt (ActivateContent) rendert ohne gültigen
  // Token die Hinweismeldung samt Link auf „Passwort vergessen" — DB-frei,
  // da peekPasswordSetupToken nur bei vorhandenem Token aufgerufen wird.
  await page.goto("/activate");
  await expect(
    page.getByText("Dieser Link ist ungültig oder abgelaufen.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Passwort vergessen" }),
  ).toBeVisible();
});

test("/offline shows a retry control", async ({ page }) => {
  await page.goto("/offline");
  await expect(
    page.getByRole("button", { name: "Erneut versuchen" }),
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
