import { test, expect } from "@playwright/test";

// Sichert das Kernversprechen dieses Layouts ab: Auf Desktop-Bildschirmen
// nehmen Inhaltstexte die GESAMTE Breite der Content-Spalte ein — früher
// deckelten .mission-detail-article (760px) und .archive-entry (720px) sie
// auf eine schmale Spalte.
//
// Geprüft wird direkt am computed style statt über eine echte Detailseite:
// /missions/… und /archive/… brauchen eine Datenbank, die in der E2E-Umgebung
// bewusst nicht existiert (siehe DATABASE_URL-Dummy in .github/workflows/
// ci.yml). Die Container werden deshalb in eine DB-freie Seite eingehängt,
// die dieselben Stylesheets lädt — geprüft wird die CSS-Regel, und genau die
// war die Ursache.
const FULL_WIDTH_CONTAINERS = [
  { className: "mission-detail-article", was: "760px" },
  { className: "archive-entry", was: "720px" },
];

for (const { className, was } of FULL_WIDTH_CONTAINERS) {
  test(`.${className} ist auf Desktop nicht mehr auf ${was} gedeckelt`, async ({
    page,
  }) => {
    await page.goto("/tutorial");

    const maxWidth = await page.evaluate((cls) => {
      const el = document.createElement("article");
      el.className = cls;
      document.body.appendChild(el);
      const value = getComputedStyle(el).maxWidth;
      el.remove();
      return value;
    }, className);

    expect(maxWidth).toBe("none");
  });
}

test("der mobile Lesemodus behält seine schmale Lesebreite", async ({
  page,
}) => {
  // Gegenprobe: Der Cap soll NICHT überall weg sein. Im Lesemodus (nur unter
  // 768px) bleibt die komfortable, zentrierte Lesebreite bewusst bestehen.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/tutorial");

  const maxWidth = await page.evaluate(() => {
    const wrapper = document.createElement("div");
    wrapper.className = "reading-mode";
    const el = document.createElement("article");
    el.className = "mission-detail-article";
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    const value = getComputedStyle(el).maxWidth;
    wrapper.remove();
    return value;
  });

  expect(maxWidth).toBe("680px");
});
