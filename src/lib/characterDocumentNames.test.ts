import { describe, expect, it } from "vitest";
import {
  CHARACTER_DOCUMENT_DISPLAY_NAME_LENGTH,
  characterDocumentDisplayName,
  characterDocumentKindLabel,
} from "./characterDocumentNames";

describe("characterDocumentDisplayName", () => {
  it("lässt kurze Dateinamen unverändert", () => {
    expect(characterDocumentDisplayName("Dienstakte.pdf")).toBe(
      "Dienstakte.pdf",
    );
  });

  it("kürzt lange Namen und lässt die Dateiendung sichtbar", () => {
    const displayed = characterDocumentDisplayName(
      "Ausführlicher Bericht über die gesamte Forschungsmission.pdf",
    );

    expect(displayed).toHaveLength(CHARACTER_DOCUMENT_DISPLAY_NAME_LENGTH);
    expect(displayed).toMatch(/…\.pdf$/);
  });

  it("bleibt auch bei sehr kleinen Grenzen innerhalb der Vorgabe", () => {
    expect(characterDocumentDisplayName("lange-datei.pdf", 4)).toBe("lan…");
  });
});

describe("characterDocumentKindLabel", () => {
  it.each([
    ["pdf", "PDF"],
    ["md", "Markdown"],
    ["docx", "DOCX"],
    ["txt", "Text"],
  ] as const)("zeigt %s als %s an", (kind, label) => {
    expect(characterDocumentKindLabel(kind)).toBe(label);
  });
});
