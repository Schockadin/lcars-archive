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

test("/tutorial zeigt den Einstiegs-Abschnitt „Erste Schritte“ zuerst", async ({
  page,
}) => {
  await page.goto("/tutorial");
  // Der Einstieg gehört an den Anfang der Anleitung — der Changelog verlinkt
  // ihn über die Abschnitts-id erste-schritte.
  const first = page.locator(".lcars-accordion-trigger").first();
  await expect(first).toContainText("Erste Schritte");
});

test("/tutorial#erste-schritte klappt den Einstieg auf", async ({ page }) => {
  // Eigener Aufruf statt eines Hash-Wechsels auf derselben Seite: das
  // Akkordeon liest den Hash beim Aufbau (siehe DataRowAccordion).
  await page.goto("/tutorial#erste-schritte");
  await expect(
    page.locator("#erste-schritte .lcars-accordion-trigger").first(),
  ).toHaveAttribute("aria-expanded", "true");
});

test("/tutorial shows the dedicated Gespräche section", async ({ page }) => {
  await page.goto("/tutorial");
  // Die Tutorial-Abschnitte sind Akkordeons (Inhalt eingeklappt), ihre
  // Kopfzeilen-Labels sind aber immer sichtbar — verifiziert, dass der
  // ausgelagerte „Gespräche"-Abschnitt vorhanden ist.
  await expect(
    page.getByText("Gespräche", { exact: true }).first(),
  ).toBeVisible();
});

test("/tutorial führt die Charaktererschaffung als eigenen Abschnitt", async ({
  page,
}) => {
  // Der Ablauf stand früher als Absatzfolge in „Eigene Inhalte". Er ist
  // jetzt ein eigener Abschnitt, damit /user/characters denselben Text im
  // Fenster zeigen und der Changelog ihn verlinken kann.
  await page.goto("/tutorial#charaktererschaffung");
  const section = page.locator("#charaktererschaffung");
  await expect(section.locator(".lcars-accordion-trigger").first()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(section).toContainText("Einen neuen Charakter");

  // Gegliedert statt als Absatzwüste — und mit einem Schema je Abschnitt.
  await expect(
    section.getByRole("heading", { level: 3, name: "Talente" }),
  ).toBeVisible();
  await expect(section.locator("svg[role=\"img\"]").first()).toBeVisible();
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

test("die öffentliche Seite erklärt sich über ihr Fragezeichen", async ({
  page,
}) => {
  // Der Menüpunkt „Hilfe" steht nur Angemeldeten zur Verfügung — ohne Konto
  // ist dieser Knopf die einzige Erklärung, die es gibt. Geprüft auf /search,
  // das für anonyme Besucher ohne Datenbank auskommt.
  await page.goto("/search");
  await page.getByRole("button", { name: "Hilfe: Suche" }).click();

  const dialog = page.getByRole("dialog", { name: "Suche" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Volltextsuche");
  // Die Schemata sind Inhalt, keine Dekoration.
  await expect(dialog.locator('svg[role="img"]').first()).toBeVisible();

  // Und wieder zu.
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("die Anleitung führt die Bereichs-Abschnitte", async ({ page }) => {
  // Dieselben Texte, die hinter den Fragezeichen stehen, gehören auch am
  // Stück lesbar in die Anleitung — sonst gäbe es sie zweimal.
  await page.goto("/tutorial#seiten-im-ueberblick");
  const seiten = page.locator("#seiten-im-ueberblick");
  await expect(
    seiten.locator(".lcars-accordion-trigger").first(),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(seiten).toContainText("Pen-&-Paper-Kampagne");

  await page.goto("/tutorial#mein-bereich");
  await expect(page.locator("#mein-bereich")).toContainText("Meine Inhalte");
});

test("der Footer führt die Anleitung nicht mehr", async ({ page }) => {
  // Sie ist in das Menü gezogen (Fragezeichen, nur für Angemeldete) — im
  // Footer bleibt, was rechtlich dorthin gehört.
  await page.goto("/tutorial");
  const footer = page.locator(".lcars-footer-bar");
  await expect(footer.getByRole("link", { name: "Impressum" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Tutorial" })).toHaveCount(0);
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
