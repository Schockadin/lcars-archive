import { test, expect } from "@playwright/test";

test("gewöhnliche Formulareingaben werden nicht global zwischengespeichert", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator("#email").fill("pilot@example.org");
  await page.locator("#password").fill("streng-geheim");

  const stored = await page.evaluate(() => JSON.stringify(sessionStorage));
  expect(stored).not.toContain("pilot@example.org");
  expect(stored).not.toContain("streng-geheim");

  await page.reload();
  await expect(page.locator("#email")).toHaveValue("");
  await expect(page.locator("#password")).toHaveValue("");
});

test("Markdown-Text außerhalb eines Inhaltseditors bleibt lokal", async ({
  page,
}) => {
  await page.goto("/dev-gallery");
  const editor = page.locator("#demo-markdown");
  await expect(editor).toHaveValue("**Text**");
  await editor.fill("Nur lokal in diesem Formular");

  const draftKeys = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((key) => key.startsWith("neo_draft:")),
  );
  expect(draftKeys).toEqual([]);

  await page.reload();
  await expect(editor).toHaveValue("**Text**");
});
