import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TUTORIAL_SECTIONS,
  tutorialSectionHref,
  tutorialSectionLabel,
} from "./tutorialSections";

describe("tutorialSections", () => {
  it("hat eindeutige ids", () => {
    const ids = TUTORIAL_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("liefert Label und Deep-Link je Abschnitt", () => {
    for (const section of TUTORIAL_SECTIONS) {
      expect(tutorialSectionLabel(section.id)).toBe(section.label);
      expect(tutorialSectionHref(section.id)).toBe(`/tutorial#${section.id}`);
    }
  });

  // Sichert die Kopplung zwischen dieser Registry und den Anker-ids auf der
  // Anleitungsseite: jeder Abschnitt muss dort als htmlId existieren, sonst
  // liefe ein Changelog-Deep-Link ins Leere.
  it("jede id existiert als htmlId in tutorial/page.tsx", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/tutorial/page.tsx"),
      "utf8",
    );
    for (const section of TUTORIAL_SECTIONS) {
      expect(page).toContain(`htmlId="${section.id}"`);
    }
  });
});
