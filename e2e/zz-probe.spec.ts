import { test } from "@playwright/test";

test("probe pin", async ({ page }) => {
  page.on("console", (m) => console.log("BROWSER:", m.text()));
  await page.goto("/dev-gallery");
  await page.waitForTimeout(1500);
  await page.locator("#demo-markdown").fill("Mein eigener Text");
  await page.waitForTimeout(600);
  console.log("VOR RELOAD STORAGE:", await page.evaluate(() => JSON.stringify(sessionStorage)));
  await page.reload();
  for (const t of [100, 300, 700, 1200, 2000, 3000]) {
    await page.waitForTimeout(t === 100 ? 100 : 0);
    const v = await page.evaluate(() => {
      const ta = document.querySelector("#demo-markdown") as HTMLTextAreaElement;
      return JSON.stringify({ value: ta?.value, text: ta?.textContent?.slice(0, 20), storage: sessionStorage.getItem("neo_draft:/dev-gallery") });
    });
    console.log(`t=${t}`, v);
    await page.waitForTimeout(t === 100 ? 200 : 400);
  }
});
