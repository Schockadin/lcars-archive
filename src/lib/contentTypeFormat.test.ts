import { describe, it, expect } from "vitest";
import {
  CONTENT_TYPE_COLOR,
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_LABEL_PLURAL,
  CONTENT_DRAFT_COLOR,
  type ContentTypeKey,
} from "./contentTypeFormat";
import { CATEGORY_CONFIG } from "./archiveFormat";
import {
  CHARACTER_STATUS_COLOR,
  CHARACTER_STATUS_LABEL,
  CHARACTER_STATUS_OPTIONS,
  CHARACTER_STATUS_ORDER,
} from "./characterFormat";

const KEYS: ContentTypeKey[] = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
  "dialogue",
];

describe("contentTypeFormat", () => {
  it("deckt jeden Inhaltstyp mit Farbe und beiden Beschriftungen ab", () => {
    for (const key of KEYS) {
      expect(CONTENT_TYPE_COLOR[key]).toBeTruthy();
      expect(CONTENT_TYPE_LABEL[key]).toBeTruthy();
      expect(CONTENT_TYPE_LABEL_PLURAL[key]).toBeTruthy();
    }
  });

  it("vergibt je Inhaltstyp eine eigene Farbe (keine Doppelbelegung)", () => {
    const colors = KEYS.map((k) => CONTENT_TYPE_COLOR[k]);
    expect(new Set(colors).size).toBe(colors.length);
  });

  // Gespräche sind in der Datenbank die Kategorie "dialogue" — beide Stellen
  // müssen dieselbe Farbe zeigen, sonst wechselt ein Gespräch je nach Seite
  // die Farbe.
  it("die Gesprächsfarbe stimmt mit der Archiv-Kategorie überein", () => {
    expect(CONTENT_TYPE_COLOR.dialogue).toBe(CATEGORY_CONFIG.dialogue.color);
  });

  it("die Entwurfsfarbe ist keine Inhaltstyp-Farbe", () => {
    expect(KEYS.map((k) => CONTENT_TYPE_COLOR[k])).not.toContain(
      CONTENT_DRAFT_COLOR,
    );
  });
});

describe("characterFormat", () => {
  it("deckt jeden Status mit Label und Farbe ab", () => {
    for (const status of CHARACTER_STATUS_ORDER) {
      expect(CHARACTER_STATUS_LABEL[status]).toBeTruthy();
      expect(CHARACTER_STATUS_COLOR[status]).toBeTruthy();
    }
  });

  it("die Auswahloptionen spiegeln Reihenfolge und Labels", () => {
    expect(CHARACTER_STATUS_OPTIONS.map((o) => o.value)).toEqual(
      CHARACTER_STATUS_ORDER,
    );
    expect(CHARACTER_STATUS_OPTIONS.map((o) => o.label)).toEqual(
      CHARACTER_STATUS_ORDER.map((s) => CHARACTER_STATUS_LABEL[s]),
    );
  });

  it("vergibt je Status eine eigene Farbe", () => {
    const colors = CHARACTER_STATUS_ORDER.map((s) => CHARACTER_STATUS_COLOR[s]);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
