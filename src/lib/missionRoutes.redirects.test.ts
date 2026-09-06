import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";
import { CHRONOLOGY_PATH, MISSION_PATH } from "./contentRoutes";

// Die alten Missions-Adressen sind Jahre in Mails, Lesezeichen und
// Suchmaschinen gelandet — dass sie weiterleiten, ist Teil des Umzugs und
// nicht bloß Kulanz.
describe("Weiterleitungen der alten Missions-Adressen", () => {
  it("führt /missions und /missions/… dauerhaft unter die Chronologie", async () => {
    const redirects = await nextConfig.redirects!();
    const uebersicht = redirects.find((r) => r.source === "/missions");
    const seiten = redirects.find((r) => r.source === "/missions/:path*");

    expect(uebersicht).toMatchObject({
      destination: CHRONOLOGY_PATH,
      permanent: true,
    });
    expect(seiten).toMatchObject({
      destination: `${MISSION_PATH}/:path*`,
      permanent: true,
    });
    // /missions allein trifft die Wildcard nicht — die Übersichts-Regel muss
    // deshalb wirklich existieren und davor stehen.
    expect(redirects.indexOf(uebersicht!)).toBeLessThan(
      redirects.indexOf(seiten!),
    );
  });
});
