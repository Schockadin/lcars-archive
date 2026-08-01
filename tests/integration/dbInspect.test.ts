import { describe, it, expect } from "vitest";
import {
  assertAdminQuery,
  classifySqlStatement,
  parseSingleSelectTable,
  buildFilterClause,
  isForeignKeyColumn,
  UnsafeQueryError,
} from "@/lib/dbInspect";

// Reine String-/Wert-Logik ohne DB-Zugriff — lebt trotzdem unter
// tests/integration/, weil dbInspect.ts "server-only" importiert (siehe
// tests/integration/stubs/server-only.ts, das nur unter der
// Integrations-Config gemappt ist; unter der Haupt-Vitest-Config würde der
// Import sofort werfen).

const ALL = { canRead: true, canWrite: true, canDelete: true };

describe("classifySqlStatement", () => {
  it("klassifiziert SELECT/WITH als read", () => {
    expect(classifySqlStatement("SELECT * FROM characters")).toBe("read");
    expect(classifySqlStatement("WITH x AS (SELECT 1) SELECT * FROM x")).toBe(
      "read",
    );
    expect(classifySqlStatement("-- Kommentar\nselect 1")).toBe("read");
  });
  it("klassifiziert INSERT/UPDATE als write, DELETE als delete", () => {
    expect(classifySqlStatement("INSERT INTO t (a) VALUES (1)")).toBe("write");
    expect(classifySqlStatement("UPDATE t SET a = 1")).toBe("write");
    expect(classifySqlStatement("DELETE FROM t WHERE a = 1")).toBe("delete");
  });
  it("klassifiziert alles andere als forbidden", () => {
    expect(classifySqlStatement("DROP TABLE t")).toBe("forbidden");
    expect(classifySqlStatement("TRUNCATE t")).toBe("forbidden");
    expect(classifySqlStatement("GRANT ALL ON t TO x")).toBe("forbidden");
  });
});

describe("assertAdminQuery", () => {
  it("akzeptiert SELECT/WITH mit sql_read und liefert die Aktion", () => {
    expect(assertAdminQuery("SELECT * FROM characters", ALL)).toBe("read");
    expect(assertAdminQuery("WITH x AS (SELECT 1) SELECT * FROM x", ALL)).toBe(
      "read",
    );
    expect(assertAdminQuery("-- just a comment\nSELECT 1", ALL)).toBe("read");
  });

  it("verweigert read ohne sql_read-Recht", () => {
    expect(() =>
      assertAdminQuery("SELECT 1", {
        canRead: false,
        canWrite: true,
        canDelete: true,
      }),
    ).toThrow(UnsafeQueryError);
  });

  it("erlaubt INSERT/UPDATE nur mit sql_write, DELETE nur mit sql_delete", () => {
    expect(assertAdminQuery("UPDATE characters SET name = 'x'", ALL)).toBe(
      "write",
    );
    expect(assertAdminQuery("DELETE FROM characters", ALL)).toBe("delete");
    const readOnly = { canRead: true, canWrite: false, canDelete: false };
    expect(() =>
      assertAdminQuery("UPDATE characters SET name = 'x'", readOnly),
    ).toThrow(UnsafeQueryError);
    expect(() => assertAdminQuery("DELETE FROM characters", readOnly)).toThrow(
      UnsafeQueryError,
    );
  });

  it("verweigert DDL/sonstiges als forbidden, auch mit allen Rechten", () => {
    expect(() => assertAdminQuery("DROP TABLE characters", ALL)).toThrow(
      UnsafeQueryError,
    );
    expect(() => assertAdminQuery("TRUNCATE characters", ALL)).toThrow(
      UnsafeQueryError,
    );
  });

  it("verweigert eine leere Query", () => {
    expect(() => assertAdminQuery("   ", ALL)).toThrow(UnsafeQueryError);
  });

  it("verweigert mehrere Anweisungen (Semikolon)", () => {
    expect(() =>
      assertAdminQuery("SELECT 1; DELETE FROM characters", ALL),
    ).toThrow(UnsafeQueryError);
  });

  it("erlaubt ein einzelnes abschließendes Semikolon", () => {
    expect(assertAdminQuery("SELECT 1;", ALL)).toBe("read");
  });

  // Denylist gegen Funktionen mit Seiteneffekten (siehe Kommentar in
  // dbInspect.ts) — greift unabhängig von den Rechten.
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
  ])("verweigert eine verbotene Funktion in %s", (query) => {
    expect(() => assertAdminQuery(query, ALL)).toThrow(UnsafeQueryError);
  });

  it("keine False-Positives bei Namen, die nur ein verbotenes Teilwort enthalten", () => {
    expect(assertAdminQuery('SELECT "pg_sleep_log" FROM archive_entries', ALL)).toBe(
      "read",
    );
  });
});

describe("parseSingleSelectTable", () => {
  it("liefert die Tabelle einer einfachen SELECT-Query", () => {
    expect(parseSingleSelectTable("SELECT * FROM characters")).toBe("characters");
    expect(
      parseSingleSelectTable("select id, name from characters where id = 1"),
    ).toBe("characters");
    expect(parseSingleSelectTable('SELECT * FROM "mission_logs"')).toBe(
      "mission_logs",
    );
    expect(parseSingleSelectTable("SELECT * FROM public.users")).toBe("users");
  });

  it("ignoriert Queries mit JOIN (keine eindeutige Zeile)", () => {
    expect(
      parseSingleSelectTable(
        "SELECT * FROM mission_logs ml JOIN missions m ON m.id = ml.mission_id",
      ),
    ).toBeNull();
  });

  it("liefert null bei fehlendem/komplexem FROM", () => {
    expect(parseSingleSelectTable("SELECT 1")).toBeNull();
    expect(parseSingleSelectTable("SELECT * FROM (SELECT 1) x")).toBeNull();
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
