import { test, expect } from "@playwright/test";

// Die Beschriftung der Hauptnavigation in der linken Leiste (SidebarMenu →
// MenuItem). Sie sieht in den drei Ansichten bewusst unterschiedlich aus:
//
//   LCARS, Desktop  „0X-Name"  (Nummer, Bindestrich, Name)
//   minimalistisch  „Name"     (weder Nummer noch Bindestrich)
//   schmale Screens  Nummer + Icon (der Name weicht, mit ihm der Bindestrich)
//
// Geprüft auf /tutorial: eine Seite ohne Datenbank (siehe fonts.spec.ts), die
// dieselbe AppShell mit derselben Leiste rendert.

// Der erste Eintrag der Hauptnavigation (MAIN_NAV[0]) — „00 / Home".
const ERSTER = ".lcars-sidebar .lcars-menu-bar";

test.describe("Hauptnavigation in der Seitenleiste", () => {
  test("schreibt im LCARS-UI „0X-Name“", async ({ page }) => {
    await page.goto("/tutorial");
    const eintrag = page.locator(ERSTER).first();
    await expect(eintrag).toBeVisible();
    // Nummer und Name stehen als eigene Elemente nebeneinander; zusammen
    // ergeben sie die Beschriftung.
    expect((await eintrag.textContent())?.trim()).toBe("00-Home");
  });

  test("zeigt im minimalistischen UI nur den Namen", async ({
    page,
    baseURL,
  }) => {
    // neo_ui=minimal setzt data-ui="minimal" schon vorm ersten Paint (siehe
    // layout.tsx) — ohne Login, weil es rein CSS-basiert ist.
    await page
      .context()
      .addCookies([{ name: "neo_ui", value: "minimal", url: baseURL! }]);
    await page.goto("/tutorial");
    await expect(page.locator("html")).toHaveAttribute("data-ui", "minimal");

    const eintrag = page.locator(ERSTER).first();
    await expect(eintrag).toBeVisible();
    // Nummer und Bindestrich sind ausgeblendet (display: none) — sichtbar
    // bleibt der Name.
    expect((await eintrag.innerText()).trim()).toBe("Home");
    await expect(eintrag.locator(".lcars-menu-id")).toBeHidden();
    await expect(eintrag.locator(".lcars-menu-sep")).toBeHidden();
  });

  test("bleibt auf schmalen Screens bei Nummer und Icon", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/tutorial");

    const eintrag = page.locator(ERSTER).first();
    await expect(eintrag).toBeVisible();
    // Der Name weicht — und mit ihm der Bindestrich, der in seinem Element
    // steckt. Die Nummer und das Icon bleiben.
    await expect(eintrag.locator(".lcars-menu-text")).toBeHidden();
    await expect(eintrag.locator(".lcars-menu-id")).toBeVisible();
    await expect(eintrag.locator(".lcars-menu-icon")).toBeVisible();
    expect((await eintrag.innerText()).trim()).toBe("00");
  });
});
