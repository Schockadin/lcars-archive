import { test, expect } from "@playwright/test";

// Entwurfs-Sicherung für Eingabefelder (src/lib/inputDraft.ts, verdrahtet in
// src/components/lcars/InputDraftKeeper.tsx): Was eingetippt wurde, steht nach
// einem Reload wieder da — Passwörter ausdrücklich nicht.
//
// /login ist dafür die richtige Probe: die Seite kommt ohne Datenbank aus
// (siehe public-pages.spec.ts) und trägt beide Fälle in einem Formular.

test("Eingaben überleben einen Reload, Passwörter nicht", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#email").fill("pilot@example.org");
  await page.locator("#password").fill("streng-geheim");
  // Der Sitzungsspeicher wird gebündelt geschrieben (300 ms) — der Reload
  // selbst löst zusätzlich eine Sicherung aus (pagehide).
  await page.waitForTimeout(500);

  await page.reload();

  await expect(page.locator("#email")).toHaveValue("pilot@example.org");
  await expect(page.locator("#password")).toHaveValue("");

  // Und das Passwort steht auch nirgends im Speicher.
  const stored = await page.evaluate(() => JSON.stringify(sessionStorage));
  expect(stored).toContain("pilot@example.org");
  expect(stored).not.toContain("streng-geheim");
});

test("Entwürfe gehören zu ihrer Seite und kommen beim Zurück wieder", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator("#email").fill("zurueck@example.org");
  await page.waitForTimeout(500);

  await page.goto("/changelog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Changelog");

  await page.goBack();
  await expect(page.locator("#email")).toHaveValue("zurueck@example.org");
});

test("ein geleertes Feld bleibt geleert", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("wieder-weg@example.org");
  await page.waitForTimeout(500);
  await page.locator("#email").fill("");
  await page.waitForTimeout(500);

  await page.reload();
  await expect(page.locator("#email")).toHaveValue("");
});

test("ein unberührtes Formular hinterlässt nichts im Speicher", async ({
  page,
}) => {
  // Die Sicherung kurz vor dem Verlassen der Seite führt nur BEREITS
  // gesicherte Felder nach. Sonst würde ein bloß geöffnetes Bearbeiten-
  // Formular seine serverseitigen Vorgabewerte sichern und sie beim nächsten
  // Aufruf über inzwischen geänderte Inhalte legen.
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();

  await page.reload();

  const stored = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((key) => key.startsWith("neo_draft:")),
  );
  expect(stored).toEqual([]);
});

// Der Fall, an dem die Sicherung zuerst scheiterte: Ein Feld mit einem vom
// Server gerenderten Vorgabewert (defaultValue) — also jeder Markdown-Editor
// und jedes Bearbeiten-Formular. Der Entwurf wurde gesichert, aber Reacts
// Hydration schrieb unmittelbar danach den Vorgabewert zurück. /dev-gallery
// rendert einen solchen Editor ohne Datenbank.
test("ein Editor mit Vorgabewert behält den getippten Text", async ({
  page,
}) => {
  await page.goto("/dev-gallery");
  const editor = page.locator("#demo-markdown");
  await expect(editor).toHaveValue("**Text**");
  // Erst tippen, wenn die Seite steht — der Normalfall. Das Tippen davor ist
  // ein eigener Fall, siehe unten.
  await page.waitForTimeout(1500);

  await editor.fill("Mein eigener Text");
  await page.waitForTimeout(500);

  await page.reload();

  // Wichtig ist das Standhalten NACH der Hydration, nicht nur unmittelbar
  // nach dem Aufbau — toHaveValue wiederholt bis zum Timeout, deshalb danach
  // noch einmal ausdrücklich prüfen.
  await expect(editor).toHaveValue("Mein eigener Text");
  await page.waitForTimeout(2000);
  await expect(editor).toHaveValue("Mein eigener Text");
});

test("das Anheften hält die Person nicht auf", async ({ page }) => {
  // Während der Anheft-Phase darf ein Feld nur nachgezogen werden, solange
  // niemand es anfasst — wer direkt nach dem Aufbau weitertippt, behält seinen
  // Text. Ohne Wartezeit nach dem Reload: genau das Fenster, in dem angeheftet
  // wird.
  await page.goto("/dev-gallery");
  const editor = page.locator("#demo-markdown");
  await page.waitForTimeout(1500);
  await editor.fill("Erster Stand");
  await page.waitForTimeout(500);

  await page.reload();
  // Sobald der Entwurf steht, sofort etwas anderes tippen — mitten in der
  // Anheft-Phase.
  await expect(editor).toHaveValue("Erster Stand");
  await editor.fill("Sofort überschrieben");
  await page.waitForTimeout(2000);

  await expect(editor).toHaveValue("Sofort überschrieben");
});

test("was vor dem Aufbau getippt wurde, geht nicht verloren", async ({
  page,
}) => {
  // Wer schneller tippt, als die Seite fertig wird, tippt in ein Feld, dessen
  // Eingaben noch niemand mitschreibt. Der erste Durchgang der Sicherung
  // übernimmt diesen Stand, statt ihn zu übergehen.
  await page.goto("/dev-gallery");
  const editor = page.locator("#demo-markdown");
  // Ohne Wartezeit: direkt nach dem Aufbau, vor der Hydration.
  await editor.fill("Schneller als die Seite");
  await page.waitForTimeout(2500);

  const stored = await page.evaluate(() =>
    sessionStorage.getItem("neo_draft:/dev-gallery"),
  );
  expect(stored).toContain("Schneller als die Seite");
});
