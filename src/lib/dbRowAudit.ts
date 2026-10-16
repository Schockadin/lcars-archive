export interface DbRowAuditSnapshot {
  values: Record<string, unknown>;
  // JSON null und SQL NULL unterscheiden sich in json/jsonb-Spalten. Die
  // Werte bleiben dadurch auch beim Zurückschreiben eindeutig.
  sqlNulls: Record<string, boolean>;
}

export interface DbRowAuditDetails {
  kind: "db_row_update" | "db_row_undo";
  table: string;
  pkColumn: string;
  pkValue: string;
  columns: string[];
  before: DbRowAuditSnapshot;
  after: DbRowAuditSnapshot;
  sourceAuditId?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function isSnapshot(
  value: unknown,
  columns: string[],
): value is DbRowAuditSnapshot {
  if (!isRecord(value)) return false;
  const snapshotValues = value.values;
  const snapshotNulls = value.sqlNulls;
  if (!isRecord(snapshotValues) || !isRecord(snapshotNulls)) return false;
  const valueKeys = Object.keys(snapshotValues).sort();
  const nullKeys = Object.keys(snapshotNulls).sort();
  const expectedKeys = [...columns].sort();
  return (
    JSON.stringify(valueKeys) === JSON.stringify(expectedKeys) &&
    JSON.stringify(nullKeys) === JSON.stringify(expectedKeys) &&
    columns.every((column) => typeof snapshotNulls[column] === "boolean")
  );
}

// Details are stored in the append-only audit table and later used to build a
// SQL update. Treat them as untrusted data anyway: malformed or older entries
// must never be able to supply identifiers to the undo action.
export function parseDbRowAuditDetails(
  details: string | null,
): DbRowAuditDetails | null {
  if (!details) return null;
  let value: unknown;
  try {
    value = JSON.parse(details);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (value.kind !== "db_row_update" && value.kind !== "db_row_undo") {
    return null;
  }
  if (
    typeof value.table !== "string" ||
    typeof value.pkColumn !== "string" ||
    typeof value.pkValue !== "string" ||
    !Array.isArray(value.columns) ||
    value.columns.length === 0 ||
    value.columns.length > 200 ||
    !value.columns.every((column) => typeof column === "string")
  ) {
    return null;
  }
  const columns = value.columns as string[];
  if (
    new Set(columns).size !== columns.length ||
    columns.includes(value.pkColumn)
  ) {
    return null;
  }
  if (!isSnapshot(value.before, columns) || !isSnapshot(value.after, columns)) {
    return null;
  }
  if (
    value.kind === "db_row_undo" &&
    (!Number.isSafeInteger(value.sourceAuditId) ||
      Number(value.sourceAuditId) < 1)
  ) {
    return null;
  }

  return {
    kind: value.kind,
    table: value.table,
    pkColumn: value.pkColumn,
    pkValue: value.pkValue,
    columns,
    before: value.before,
    after: value.after,
    ...(value.kind === "db_row_undo"
      ? { sourceAuditId: Number(value.sourceAuditId) }
      : {}),
  };
}

export function summarizeDbRowAuditDetails(details: DbRowAuditDetails): string {
  const target = `${details.table} · ${details.pkColumn}=${details.pkValue}`;
  if (details.kind === "db_row_undo") {
    return `${target} · Rücknahme von Audit-Eintrag #${details.sourceAuditId}`;
  }
  return `${target} · Felder: ${details.columns.join(", ")}`;
}

function formatSnapshotValue(
  snapshot: DbRowAuditSnapshot,
  column: string,
): string {
  if (snapshot.sqlNulls[column]) return "SQL NULL";
  return JSON.stringify(snapshot.values[column], null, 2) ?? "undefined";
}

export function formatDbRowAuditDiff(details: DbRowAuditDetails): string {
  return details.columns
    .map(
      (column) =>
        `${column}\nVorher:\n${formatSnapshotValue(details.before, column)}\nNachher:\n${formatSnapshotValue(details.after, column)}`,
    )
    .join("\n\n");
}
