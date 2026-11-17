import { expect, test } from "@playwright/test";

// Ungültige Transformationsgrößen müssen vor DB-/R2-Zugriff scheitern;
// funktioniert deshalb auch am lokalen Testserver mit Dummy-Datenbank.
test("weist frei wählbare Thumbnailgrößen vor der Bildverarbeitung zurück", async ({
  request,
}) => {
  for (const width of ["0", "-1", "100000", "156.0", "abc"]) {
    const response = await request.get(`/api/content-images/7?width=${width}`);
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("Vorschaubildgröße");
  }
});
