import { describe, expect, it } from "vitest";
import {
  formatDbRowAuditDiff,
  parseDbRowAuditDetails,
  summarizeDbRowAuditDetails,
  type DbRowAuditDetails,
} from "./dbRowAudit";

const details: DbRowAuditDetails = {
  kind: "db_row_update",
  table: "archive_entries",
  pkColumn: "id",
  pkValue: "525",
  columns: ["metadata"],
  before: {
    values: { metadata: { participants: [] } },
    sqlNulls: { metadata: false },
  },
  after: {
    values: { metadata: { participants: [{ name: "A" }] } },
    sqlNulls: { metadata: false },
  },
};

describe("Audit-Einträge für DB-Zeilenänderungen", () => {
  it("liest vollständige Vorher-/Nachher-Schnappschüsse", () => {
    expect(parseDbRowAuditDetails(JSON.stringify(details))).toEqual(details);
  });

  it("liefert eine kompakte, lesbare Zusammenfassung", () => {
    expect(summarizeDbRowAuditDetails(details)).toBe(
      "archive_entries · id=525 · Felder: metadata",
    );
  });

  it("formatiert die alten und neuen Zellwerte für die Audit-Ansicht", () => {
    expect(formatDbRowAuditDiff(details)).toContain(
      'Vorher:\n{\n  "participants": []\n}\nNachher:\n{\n  "participants": [\n    {\n      "name": "A"\n    }\n  ]\n}',
    );
  });

  it("verwirft Details mit ungesicherten oder inkonsistenten Spalten", () => {
    const tampered = {
      ...details,
      columns: ["id; DROP TABLE users"],
    };
    expect(parseDbRowAuditDetails(JSON.stringify(tampered))).toBeNull();
  });

  it("unterscheidet SQL NULL von JSON null", () => {
    const withNulls = {
      ...details,
      before: { values: { metadata: null }, sqlNulls: { metadata: true } },
    };
    expect(parseDbRowAuditDetails(JSON.stringify(withNulls))).toMatchObject({
      before: { values: { metadata: null }, sqlNulls: { metadata: true } },
    });
  });
});
