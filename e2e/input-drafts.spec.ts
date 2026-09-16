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
