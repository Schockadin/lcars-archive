import { describe, it, expect } from "vitest";
import { checkTalentRequirement } from "@/lib/talentRequirements";
import { parseCharacterStats } from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";

function context(
  overrides: {
    attributes?: Record<string, number>;
    departments?: Record<string, number>;
    talents?: string[];
    species?: string | null;
  } = {},
) {
  const stats: CharacterStats = parseCharacterStats({
    attributes: overrides.attributes ?? {},
    departments: overrides.departments ?? {},
    talents: overrides.talents ?? [],
  });
  return { stats, species: overrides.species ?? null };
}

describe("checkTalentRequirement: Zahlenwerte", () => {
  const ctx = context({
    attributes: { control: 9, daring: 8 },
    departments: { command: 3, medicine: 2, science: 4 },
  });

  it("gilt ohne Voraussetzung immer als erfüllt", () => {
    expect(checkTalentRequirement(null, ctx).status).toBe("met");
    expect(checkTalentRequirement("   ", ctx).status).toBe("met");
  });

  it("prüft einen einzelnen Wert gegen den Mindestwert", () => {
    expect(checkTalentRequirement("Control 9+", ctx).status).toBe("met");
    expect(checkTalentRequirement("Control 11+", ctx).status).toBe("unmet");
    expect(checkTalentRequirement("Daring 9+", ctx).status).toBe("unmet");
  });

  it("versteht eine Zahl ohne Plus als Mindestwert", () => {
    expect(checkTalentRequirement("Science 4", ctx).status).toBe("met");
    expect(checkTalentRequirement("Science 5", ctx).status).toBe("unmet");
  });

  it("verknüpft mehrere Bedingungen mit UND — auch über Komma, & und „und“", () => {
    expect(checkTalentRequirement("Command 3+ and Science 4+", ctx).status).toBe("met");
    expect(checkTalentRequirement("Command 3+, Medicine 3+", ctx).status).toBe("unmet");
    expect(checkTalentRequirement("Command 3+ & Science 4+", ctx).status).toBe("met");
    expect(checkTalentRequirement("Command 3+ und Control 9+", ctx).status).toBe("met");
  });

  it("verknüpft ODER-Zweige — ein erfüllter genügt", () => {
    expect(checkTalentRequirement("Medicine 3+ or Science 3+", ctx).status).toBe("met");
    // Beide Zweige verfehlt (Medizin 2, Steuerung nicht gepflegt → unbekannt):
    // das „unbekannt" schlägt das „nicht erfüllt", im Zweifel wird angezeigt.
    expect(checkTalentRequirement("Medicine 3+ or Conn 3+", ctx).status).toBe("unknown");
    expect(checkTalentRequirement("Medicine 3+ or Command 5+", ctx).status).toBe("unmet");
  });

  it("nennt die nicht erfüllte Bedingung im Klartext", () => {
    const result = checkTalentRequirement("Command 3+, Medicine 3+", ctx);
    expect(result.unmet).toEqual(["Medicine 3+"]);
  });

  it("gilt als unbekannt, solange der Wert noch nicht gepflegt ist", () => {
    // Ein leerer Bogen: der Wert existiert, steht nur noch nicht da — das darf
    // das Talent nicht verstecken.
    expect(checkTalentRequirement("Control 9+", context()).status).toBe("unknown");
  });
});

describe("checkTalentRequirement: Spezies", () => {
  it("erkennt die Spezies auch in deutscher Schreibweise", () => {
    expect(checkTalentRequirement("Vulcan", context({ species: "Vulkanierin" })).status).toBe("met");
    expect(checkTalentRequirement("Human", context({ species: "Mensch" })).status).toBe("met");
    expect(checkTalentRequirement("Klingon", context({ species: "Klingone" })).status).toBe("met");
    expect(checkTalentRequirement("Klingon", context({ species: "Mensch" })).status).toBe("unmet");
  });

  it("ignoriert Zusätze wie „female“", () => {
    expect(checkTalentRequirement("Orion female", context({ species: "Orionerin" })).status).toBe("met");
  });

  it("bleibt unbekannt, solange die Spezies unbekannt oder ungepflegt ist", () => {
    expect(checkTalentRequirement("Vulcan", context()).status).toBe("unknown");
    expect(checkTalentRequirement("Vulcan", context({ species: "Xindi-Primaten" })).status).toBe("unknown");
  });
});

describe("checkTalentRequirement: andere Talente und Unentscheidbares", () => {
  it("erkennt ein vorausgesetztes Talent auf dem Bogen", () => {
    const ctx = context({
      departments: { science: 3 },
      talents: ["Testing a Theory"],
    });
    expect(checkTalentRequirement("Science 3+ and Testing a Theory", ctx).status).toBe("met");
  });

  it("erkennt es auch unter einem eigenen Namen", () => {
    const ctx = context({
      departments: { science: 3 },
      talents: ["Hypothesenschmiede (Testing a Theory)"],
    });
    expect(checkTalentRequirement("Science 3+ and Testing a Theory", ctx).status).toBe("met");
  });

  it("versteckt nichts, was es nicht entscheiden kann", () => {
    const ctx = context({ departments: { command: 4 } });
    const result = checkTalentRequirement(
      "Command 4+, Commanding/Executive Officer, Main Character",
      ctx,
    );
    expect(result.status).toBe("unknown");
    expect(result.unchecked).toContain("Main Character");
    expect(checkTalentRequirement("GM's discretion", ctx).status).toBe("unknown");
  });

  it("lässt ein klar verfehltes Zahlenkriterium auch mit Unbekanntem daneben durchfallen", () => {
    const ctx = context({ departments: { command: 2 } });
    expect(
      checkTalentRequirement("Command 4+, Main Character", ctx).status,
    ).toBe("unmet");
  });
});
