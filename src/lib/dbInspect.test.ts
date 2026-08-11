import { describe, it, expect } from "vitest";
import {
  parseSingleSelectTable,
  isSelectStarQuery,
  parseWriteTarget,
  assertAdminQuery,
  isProtectedWriteTable,
  UnsafeQueryError,
  type AdminQueryCapabilities,
} from "./dbInspect";

const ALL: AdminQueryCapabilities = {
  canRead: true,
  canWrite: true,
  canDelete: true,
};

describe("parseSingleSelectTable", () => {
  it("liefert die Tabelle einer einfachen Einzel-Tabellen-Query", () => {
    expect(parseSingleSelectTable("SELECT * FROM characters")).toBe("characters");
    expect(parseSingleSelectTable('SELECT * FROM "public"."missions" WHERE id = 1')).toBe(
      "missions",
    );
  });
  it("gibt null bei JOIN zurück", () => {
    expect(
      parseSingleSelectTable("SELECT * FROM a JOIN b ON a.id = b.a_id"),
    ).toBeNull();
  });
  it("gibt null bei Komma-Join zurück", () => {
    expect(parseSingleSelectTable("SELECT * FROM characters, users")).toBeNull();
    expect(
      parseSingleSelectTable("SELECT * FROM characters c, users u WHERE c.id = u.id"),
    ).toBeNull();
  });
});

describe("isSelectStarQuery", () => {
  it("true nur für SELECT * FROM …", () => {
    expect(isSelectStarQuery("SELECT * FROM characters")).toBe(true);
    expect(isSelectStarQuery("  select   *   from characters where id=1")).toBe(true);
  });
  it("false bei expliziter Spaltenliste oder Alias auf id", () => {
    expect(isSelectStarQuery("SELECT id, title FROM missions")).toBe(false);
    expect(isSelectStarQuery("SELECT mission_id AS id FROM mission_logs")).toBe(false);
    expect(isSelectStarQuery("WITH x AS (SELECT * FROM a) SELECT * FROM x")).toBe(false);
  });
});

describe("parseWriteTarget", () => {
  it("erkennt INSERT/UPDATE/DELETE-Ziel", () => {
    expect(parseWriteTarget("INSERT INTO users (id) VALUES (1)")).toBe("users");
    expect(parseWriteTarget("UPDATE roles SET permissions = '{}'")).toBe("roles");
    expect(parseWriteTarget("DELETE FROM admin_audit_log")).toBe("admin_audit_log");
    expect(parseWriteTarget('UPDATE "public"."users" SET x = 1')).toBe("users");
  });
  it("gibt null bei SELECT zurück", () => {
    expect(parseWriteTarget("SELECT * FROM users")).toBeNull();
  });
  it("durchschaut Block-Kommentare zwischen Schlüsselwort und Tabelle", () => {
    // Postgres behandelt /**/ als Whitespace → schreibt nach users. Ohne das
    // Kommentar-Entfernen lieferte der Positions-Parse null und die
    // Schutztabellen-Prüfung würde übersprungen (Rechte-Eskalation).
    expect(parseWriteTarget("UPDATE/**/users SET role='admin' WHERE id=1")).toBe(
      "users",
    );
    expect(parseWriteTarget("DELETE/**/FROM/**/roles WHERE id=1")).toBe("roles");
    expect(parseWriteTarget("INSERT/**/INTO users (id) VALUES (1)")).toBe(
      "users",
    );
  });
});

describe("assertAdminQuery — Rechte", () => {
  it("erlaubt normale Inhalts-Queries entsprechend der Aktion", () => {
    expect(assertAdminQuery("SELECT * FROM characters", ALL)).toBe("read");
    expect(assertAdminQuery("UPDATE characters SET name='x' WHERE id=1", ALL)).toBe(
      "write",
    );
    expect(assertAdminQuery("DELETE FROM mission_logs WHERE id=1", ALL)).toBe("delete");
  });
  it("erzwingt die caps", () => {
    expect(() =>
      assertAdminQuery("SELECT * FROM characters", {
        canRead: false,
        canWrite: true,
        canDelete: true,
      }),
    ).toThrow(UnsafeQueryError);
  });
});

describe("assertAdminQuery — Härtung (PR#53-Findings)", () => {
  it("sperrt Credential-Spalten (auch per Alias)", () => {
    expect(() => assertAdminQuery("SELECT password_hash FROM users", ALL)).toThrow(
      /password_hash/,
    );
    expect(() =>
      assertAdminQuery("SELECT password_hash AS x FROM users", ALL),
    ).toThrow(/password_hash/);
    expect(() => assertAdminQuery("SELECT token_hash FROM x", ALL)).toThrow(
      /token_hash/,
    );
  });
  it("sperrt Geheimnis-Tabellen komplett", () => {
    expect(() =>
      assertAdminQuery("SELECT * FROM password_setup_tokens", ALL),
    ).toThrow(/password_setup_tokens/);
  });
  it("sperrt Schreibzugriff auf Auth-/Sicherheits-Tabellen", () => {
    for (const q of [
      "UPDATE users SET role='admin' WHERE id=1",
      "DELETE FROM roles WHERE key='x'",
      "INSERT INTO users (id) VALUES (1)",
      "DELETE FROM admin_audit_log",
      // Bypass-Varianten: Block-Kommentar als Whitespace zwischen
      // Schlüsselwort und Tabellenname (Postgres schreibt trotzdem nach users/
      // roles). Früher übersprang der Positions-Parse hier still die Prüfung
      // → Rechte-Eskalation eines db-admin (sql_write) zu admin.
      "UPDATE/**/users SET role='admin' WHERE id=1",
      "DELETE/**/FROM/**/roles WHERE key='x'",
    ]) {
      expect(() => assertAdminQuery(q, ALL)).toThrow(UnsafeQueryError);
    }
  });
  it("lehnt schreibende Statements mit unbestimmbarer Ziel-Tabelle fail-closed ab", () => {
    // Kann die Ziel-Tabelle nicht eindeutig bestimmt werden (z.B. führender
    // Block-Kommentar, verschachtelter Kommentar), wird das Write abgelehnt
    // statt die Schutztabellen-Prüfung zu überspringen.
    expect(() =>
      assertAdminQuery("UPDATE/*/**/*/users SET role='admin' WHERE id=1", ALL),
    ).toThrow(UnsafeQueryError);
  });
  it("erlaubt Writes auf Inhalts-Tabellen auch mit Kommentar", () => {
    // Positiv-Fall: der Kommentar wird korrekt aufgelöst → mission_logs ist
    // nicht geschützt → Write bleibt zulässig.
    expect(
      assertAdminQuery("UPDATE/**/mission_logs SET title='x' WHERE id=1", ALL),
    ).toBe("write");
  });
  it("erlaubt Lesen der users-Tabelle (ohne Secret-Spalte)", () => {
    // Lesen bleibt erlaubt — die Secret-Spalte wird separat im Ergebnis
    // entfernt (runAdminQuery), die Query selbst ist zulässig.
    expect(assertAdminQuery("SELECT * FROM users", ALL)).toBe("read");
  });
});

describe("isProtectedWriteTable", () => {
  it("erkennt Auth-/Sicherheits-Tabellen (case-insensitiv)", () => {
    expect(isProtectedWriteTable("users")).toBe(true);
    expect(isProtectedWriteTable("ROLES")).toBe(true);
    expect(isProtectedWriteTable("admin_audit_log")).toBe(true);
  });
  it("lässt Inhalts-Tabellen zu", () => {
    expect(isProtectedWriteTable("characters")).toBe(false);
    expect(isProtectedWriteTable("mission_logs")).toBe(false);
  });
});

describe("assertAdminQuery — reguläre Lese-Queries bleiben zulässig", () => {
  it("blockiert legitime Queries ohne verdächtige Tokens NICHT", () => {
    expect(assertAdminQuery("SELECT array_agg(name) FROM users", ALL)).toBe("read");
    expect(assertAdminQuery("SELECT json_agg(id) FROM characters", ALL)).toBe("read");
    expect(assertAdminQuery("SELECT id, name FROM users u", ALL)).toBe("read");
    // to_json ist keine verbotene Funktion und kein Secret-Name.
    expect(
      assertAdminQuery("SELECT id, title FROM missions WHERE title <> 'x'", ALL),
    ).toBe("read");
  });

  it("sperrt echte Referenzen (außerhalb von Literalen)", () => {
    expect(() =>
      assertAdminQuery("SELECT password_hash FROM users", ALL),
    ).toThrow(/password_hash/);
    expect(() =>
      assertAdminQuery("SELECT * FROM password_setup_tokens", ALL),
    ).toThrow(/password_setup_tokens/);
  });
});

// Sicherheit vor Bequemlichkeit: die Prüfungen laufen bewusst gegen den ROHEN
// Query-Text. Das kann nur konservativ ZU VIEL ablehnen (ein Secret-Name/;/
// Funktionsname als reiner Literal-Text sperrt die Query), ist dafür aber nicht
// per String-/Kommentar-Maskierung UMGEHBAR — anders als eine „bereinigte"
// Fassung, die einen exakten Postgres-Tokenizer erfordern würde (E''-Escapes,
// verschachtelte Kommentare, Dollar-Quotes …).
describe("assertAdminQuery — nicht umgehbar (Rohtext-Prüfung)", () => {
  it("erkennt verkettete Statements (statement chaining)", () => {
    // Ohne diese Sperre würde das 2. Statement die PROTECTED_WRITE_TABLES-Prüfung
    // umgehen (die nur das 1. Statement parst).
    for (const q of [
      "UPDATE characters SET name='/*' WHERE id=1; UPDATE users SET x='y' WHERE id=1 AND '*/'=''",
      "UPDATE characters SET a=1 -- it's\n; DELETE FROM users WHERE b='x'",
      // Postgres-E''-Escape-String — der Rohtext enthält trotzdem das echte `;`.
      "UPDATE characters SET name=E'\\'';DELETE FROM users",
    ]) {
      expect(() => assertAdminQuery(q, ALL)).toThrow(/einzelne Anweisung/);
    }
  });
  it("erkennt verbotene Funktionen auch neben Masken-Literalen", () => {
    expect(() =>
      assertAdminQuery("SELECT '/*', pg_sleep(30), '*/'", ALL),
    ).toThrow(UnsafeQueryError);
  });
  it("erkennt aliasierte Secret-Spalte (auch mit E''-Trick)", () => {
    expect(() =>
      assertAdminQuery(
        "SELECT '/*' AS a, password_hash AS h FROM users WHERE '*/'=''",
        ALL,
      ),
    ).toThrow(/password_hash/);
    expect(() =>
      assertAdminQuery("SELECT E'\\'' AS x, password_hash AS pw FROM users", ALL),
    ).toThrow(/password_hash/);
  });
});
