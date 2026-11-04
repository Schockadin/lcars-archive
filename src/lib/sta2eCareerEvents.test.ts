import { describe, expect, it } from "vitest";
import {
  careerEventByIdOrTitle,
  careerEventTitle,
  normalizeCareerEventEntry,
  rollCareerEvent,
  STA2E_CAREER_EVENTS,
} from "./sta2eCareerEvents";

describe("STA 2e Career Events", () => {
  it("führt die zwanzig Ereignisse der W20-Tabelle in Würfelreihenfolge", () => {
    expect(STA2E_CAREER_EVENTS).toHaveLength(20);
    expect(STA2E_CAREER_EVENTS.map((event) => event.roll)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(STA2E_CAREER_EVENTS[0].title).toBe("Betrayed Ideals for a Superior");
    expect(STA2E_CAREER_EVENTS[19].title).toBe("Transporter Accident");
  });

  it("würfelt die Tabellenränder korrekt und liefert die festen Boni", () => {
    expect(rollCareerEvent(() => 0).id).toBe("betrayed-ideals-for-a-superior");
    expect(rollCareerEvent(() => 0.999999).id).toBe("transporter-accident");
    expect(careerEventByIdOrTitle("first-contact")).toMatchObject({
      attribute: "presence",
      department: "any",
      focusSuggestions: ["Cultural Studies", "Diplomacy", "Infiltration"],
    });
    expect(careerEventByIdOrTitle("breakthrough-or-invention")?.optionalTrait)
      .toBe("Inventor of X");
  });

  it("migriert bekannte alte Namen und bewahrt freie Alt-Einträge", () => {
    expect(normalizeCareerEventEntry("First Contact")).toBe("first-contact");
    expect(careerEventTitle("first-contact")).toBe("First Contact");
    expect(normalizeCareerEventEntry("Eine persönliche alte Notiz")).toBe(
      "Eine persönliche alte Notiz",
    );
  });
});
