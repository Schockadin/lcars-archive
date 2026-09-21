import { test, expect } from "@playwright/test";

// Die Einstiegs-Liste („Erste Schritte", /willkommen und Dashboard). Geprüft
// wird die Komponente auf /dev-gallery — die echte Seite braucht Login und
// Datenbank — plus das Verhalten der Route für nicht Angemeldete.
test.describe("Erste Schritte", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#onboarding-checklist")).toBeVisible();
  });

  test("führt vier Schritte auf", async ({ page }) => {
    // „Ein Gespräch beginnen" ist als fünfter Schritt entfallen: Er hing
    // anders als die übrigen an einem Gegenüber, das mitspielen muss (siehe
    // den Kopf von src/lib/onboardingSteps.ts).
    await expect(page.locator("#onboarding-checklist ol > li")).toHaveCount(4);
  });

  test("nennt den Fortschritt in Zahlen", async ({ page }) => {
    await expect(page.locator("#onboarding-checklist")).toContainText(
      "2 von 4 Schritten erledigt",
    );
  });

  test("verlinkt nur die offenen Schritte", async ({ page }) => {
    // Erledigte Schritte brauchen keinen Link — es gibt dort nichts mehr zu
    // tun. Zwei von vier sind in der Attrappe erledigt.
    await expect(page.locator("#onboarding-checklist ol a")).toHaveCount(2);
  });

  test("führt vom offenen Charakter-Schritt in den Assistenten", async ({
    page,
  }) => {
    await expect(
      page.locator('#onboarding-checklist a[href="/user/characters"]'),
    ).toHaveCount(1);
  });
});

test.describe("/willkommen", () => {
  test("schickt nicht Angemeldete zur Anmeldung", async ({ page }) => {
    await page.goto("/willkommen");
    await expect(page).toHaveURL(/\/login/);
  });
});
