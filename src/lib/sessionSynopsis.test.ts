import { describe, expect, it } from "vitest";
import { appendSessionSynopsis } from "./sessionSynopsis";

describe("appendSessionSynopsis", () => {
  it("hängt den Session-Bericht datiert an den bestehenden Synopsis-Text", () => {
    expect(
      appendSessionSynopsis(
        "Bisherige Zusammenfassung",
        "2401-08-03",
        "Die Crew erreichte den Außenposten.",
      ),
    ).toBe(
      "Bisherige Zusammenfassung\n\n## Session vom 2401-08-03\n\nDie Crew erreichte den Außenposten.",
    );
  });

  it("legt eine Zusammenfassung an, wenn noch kein Synopsis-Text vorhanden ist", () => {
    expect(appendSessionSynopsis(null, "2401-08-03", "Ereignis."))
      .toBe("## Session vom 2401-08-03\n\nEreignis.");
  });
});
