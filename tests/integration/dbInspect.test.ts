import { describe, it, expect } from "vitest";
import {
  assertReadOnlyQuery,
  buildFilterClause,
  isForeignKeyColumn,
  UnsafeQueryError,
} from "@/lib/dbInspect";

// Reine String-/Wert-Logik ohne DB-Zugriff — lebt trotzdem unter
// tests/integration/, weil dbInspect.ts "server-only" importiert (siehe
// tests/integration/stubs/server-only.ts, das nur unter der
// Integrations-Config gemappt ist; unter der Haupt-Vitest-Config würde der
// Import sofort werfen).

describe("assertReadOnlyQuery", () => {
  it("accepts a plain SELECT", () => {
    expect(() => assertReadOnlyQuery("SELECT * FROM characters")).not.toThrow();
  });

  it("accepts a WITH/CTE query", () => {
    expect(() =>
      assertReadOnlyQuery("WITH x AS (SELECT 1) SELECT * FROM x"),
    ).not.toThrow();
  });

  it("accepts a query preceded by a leading comment", () => {
    expect(() =>
      assertReadOnlyQuery("-- just a comment\nSELECT 1"),
    ).not.toThrow();
  });

  it("rejects an empty query", () => {
    expect(() => assertReadOnlyQuery("   ")).toThrow(UnsafeQueryError);
  });

  it("rejects anything that isn't SELECT/WITH", () => {
    expect(() => assertReadOnlyQuery("DELETE FROM characters")).toThrow(
      UnsafeQueryError,
    );
    expect(() => assertReadOnlyQuery("UPDATE characters SET name = 'x'")).toThrow(
      UnsafeQueryError,
    );
  });

  it("rejects multiple statements separated by a semicolon", () => {
    expect(() =>
      assertReadOnlyQuery("SELECT 1; DELETE FROM characters"),
    ).toThrow(UnsafeQueryError);
  });

  it("allows a single trailing semicolon", () => {
    expect(() => assertReadOnlyQuery("SELECT 1;")).not.toThrow();
  });

  // Denylist gegen Funktionen mit Seiteneffekten, die eine READ ONLY-
  // Transaktion laut Postgres-Doku NICHT verhindert (siehe Kommentar in
  // dbInspect.ts) — zweite Verteidigungsebene neben der Transaktion selbst.
  it.each([
    "SELECT nextval('characters_id_seq')",
    "SELECT setval('characters_id_seq', 1)",
    "SELECT pg_advisory_lock(1)",
    "SELECT pg_advisory_xact_lock(1)",
    "SELECT pg_try_advisory_lock(1)",
    "SELECT pg_advisory_unlock(1)",
    "SELECT pg_sleep(10)",
    "SELECT pg_terminate_backend(123)",
    "SELECT pg_cancel_backend(123)",
    "SELECT dblink_exec('', '')",
    "SELECT lo_import('/etc/passwd')",
    "SELECT set_config('statement_timeout', '0', false)",
  ])("rejects a query calling the forbidden function in %s", (query) => {
    expect(() => assertReadOnlyQuery(query)).toThrow(UnsafeQueryError);
  });

  it("does not false-positive on column/table names that merely contain a forbidden substring", () => {
    // "pg_sleep_log" ist kein echter Aufruf von pg_sleep(...) — die Denylist
    // matcht auf Funktionsaufrufe (Name gefolgt von "("), nicht auf jedes
    // Vorkommen des Namens irgendwo im Text.
    expect(() =>
      assertReadOnlyQuery('SELECT "pg_sleep_log" FROM archive_entries'),
    ).not.toThrow();
  });
});

describe("buildFilterClause", () => {
  it("builds an ILIKE clause for a normal text column", () => {
    const { whereSql, params } = buildFilterClause(
      "characters",
      { name: "Kira" },
      1,
    );
    expect(whereSql).toBe('WHERE "name"::text ILIKE $1');
    expect(params).toEqual(["%Kira%"]);
  });

  it("ignores columns that aren't in the table's whitelist", () => {
    const { whereSql, params } = buildFilterClause(
      "characters",
      { not_a_real_column: "x" },
      1,
    );
    expect(whereSql).toBe("");
    expect(params).toEqual([]);
  });

  it("ignores blank filter values", () => {
    const { whereSql, params } = buildFilterClause(
      "characters",
      { name: "   " },
      1,
    );
    expect(whereSql).toBe("");
    expect(params).toEqual([]);
  });

  it("builds an exact ::boolean comparison for a boolean column with a valid value", () => {
    const { whereSql, params } = buildFilterClause(
      "archive_entries",
      { dialogue_open: "true" },
      1,
    );
    expect(whereSql).toBe('WHERE "dialogue_open" = $1::boolean');
    expect(params).toEqual(["true"]);
  });

  it("normalizes boolean filter casing", () => {
    const { params } = buildFilterClause(
      "archive_entries",
      { dialogue_open: "FALSE" },
      1,
    );
    expect(params).toEqual(["false"]);
  });

  it("silently drops an invalid boolean filter value instead of building a broken clause", () => {
    // Regression: ein manipulierter f_dialogue_open=xyz-Query-Param sollte
    // die Query nicht mehr mit einem ungefangenen Postgres-Fehler abstürzen
    // lassen (invalid input syntax for type boolean) — buildFilterClause
    // ignoriert den Filter jetzt einfach.
    const { whereSql, params } = buildFilterClause(
      "archive_entries",
      { dialogue_open: "xyz" },
      1,
    );
    expect(whereSql).toBe("");
    expect(params).toEqual([]);
  });

  it("numbers multiple clauses sequentially starting at startIndex", () => {
    const { whereSql, params } = buildFilterClause(
      "archive_entries",
      { title: "Log", dialogue_open: "true" },
      3,
    );
    expect(whereSql).toBe('WHERE "title"::text ILIKE $3 AND "dialogue_open" = $4::boolean');
    expect(params).toEqual(["%Log%", "true"]);
  });
});

describe("isForeignKeyColumn", () => {
  it("returns true for a known foreign-key column", () => {
    expect(isForeignKeyColumn("characters", "player_id")).toBe(true);
    expect(isForeignKeyColumn("archive_entries", "owner_user_id")).toBe(true);
  });

  it("returns false for a non-foreign-key column on the same table", () => {
    expect(isForeignKeyColumn("characters", "name")).toBe(false);
  });

  it("returns false for a table with no foreign-key columns at all", () => {
    expect(isForeignKeyColumn("timeline_events", "title")).toBe(false);
  });
});
