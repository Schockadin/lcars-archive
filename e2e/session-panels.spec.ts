import { test, expect } from "@playwright/test";

test("Allgemeine Chronologie: einzelne Panels ohne ToC oder Sammelbutton", async ({ page }) => {
  await page.goto("/dev-gallery");
  const view = page.locator("#timeline-sessions");
  await expect(view.locator(".lcars-toc")).toHaveCount(0);
  await expect(view.getByRole("button", { name: /Alle Session-Panels/ })).toHaveCount(0);
  await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
  await view.locator("[data-session-panel] summary").first().click();
  await expect(view.locator("[data-session-panel][open]")).toHaveCount(1);
  await view.locator("[data-session-panel] summary").first().click();
  await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
});

test("Missionschronik: ein Textbutton wechselt zwischen Öffnen und Schließen", async ({ page }) => {
    await page.goto("/dev-gallery");
    const view = page.locator("#mission-session-panels");
    const panels = view.locator("[data-session-panel]");
    await expect(panels).toHaveCount(2);
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
    const close = view.getByRole("button", { name: "Alle Session-Panels schließen" });
    const open = view.getByRole("button", { name: "Alle Session-Panels öffnen" });
    await expect(view.getByRole("button", { name: /Alle Session-Panels/ })).toHaveCount(1);
    await expect(open).toHaveCount(0);
    await expect(close).toHaveText("−");
    await expect(close.locator("svg")).toHaveCount(0);
    await close.click();
    await expect(close).toHaveCount(0);
    await expect(open).toHaveText("+");
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(0);
    await panels.first().locator("summary").click();
    await expect(panels.first()).toHaveAttribute("open", "");
    await expect(open).toHaveText("+");
    await open.click();
    await expect(close).toHaveText("−");
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
    await panels.first().locator("summary").click();
    await expect(panels.first()).not.toHaveAttribute("open");
    await open.click();
    await expect(view.locator("[data-session-panel][open]")).toHaveCount(2);
    await close.click();
    await view.locator(".lcars-toc-link").first().click();
    await expect(panels.first()).toHaveAttribute("open", "");
    await expect(panels.last()).not.toHaveAttribute("open");
});

test("Komplettsynopsis zeigt Datum ohne Synopsis-Präfix", async ({ page }) => {
  await page.goto("/dev-gallery");
  const synopsis = page.locator("#mission-session-panels #mission-full-synopsis");
  await expect(synopsis.getByRole("heading")).toHaveText(["Synopsis", "08.03.2401", "07.03.2401"]);
  await expect(synopsis).toContainText("Bericht vom 8. März.");
  await expect(synopsis).not.toContainText("Veraltete Fassung");
});

test("fasst gleiche Synopsis-Daten zusammen, lässt die Karten aber separat", async ({
  page,
}) => {
  await page.goto("/dev-gallery");
  const overview = page.locator("#mission-synopsis-same-date");

  await expect(overview.locator(".timeline-card")).toHaveCount(2);
  const synopsis = overview.locator("#mission-full-synopsis");
  await expect(synopsis.locator("h4")).toHaveCount(1);
  await expect(synopsis.locator("h4")).toHaveText("10.03.2401");
  await expect(synopsis).toContainText("Eintrag 1 vom selben Tag.");
  await expect(synopsis).toContainText("Eintrag 2 vom selben Tag.");
});


test("Missionschronik-ToC bleibt auf 85dvh begrenzt und ist vertikal scrollbar", async ({ page }) => {
  await page.goto("/dev-gallery");
  const panel = page.locator("#mission-synopsis-same-date .mission-chronicle-toc-column details").first();
  if (!(await panel.evaluate((node) => (node as HTMLDetailsElement).open))) {
    await panel.locator("summary").click();
  }

  const toc = page.locator("#mission-synopsis-same-date .mission-chronicle-toc-column .lcars-toc");
  await expect(toc).toBeVisible();
  const metrics = await toc.evaluate((node) => {
    const list = node.querySelector("ul");
    if (!list) throw new Error("ToC-Liste fehlt");
    list.replaceChildren(...Array.from({ length: 50 }, (_, index) => {
      const item = document.createElement("li");
      const link = document.createElement("div");
      link.className = "lcars-toc-link";
      link.textContent = "Zusätzlicher Eintrag " + (index + 1);
      item.appendChild(link);
      return item;
    }));
    const style = getComputedStyle(node);
    return {
      maxHeight: parseFloat(style.maxHeight),
      overflowY: style.overflowY,
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });

  expect(metrics.overflowY).toBe("auto");
  expect(metrics.maxHeight).toBeCloseTo(metrics.viewportHeight * 0.85, 0);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await toc.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  expect(await toc.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
});
