import { describe, it, expect } from "vitest";
import {
  parseSingleSelectTable,
  isSelectStarQuery,
  parseWriteTarget,
  assertAdminQuery,
  isProtectedWriteTable,
  selectsWholeRow,
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
    ]) {
      expect(() => assertAdminQuery(q, ALL)).toThrow(UnsafeQueryError);
    }
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

describe("selectsWholeRow", () => {
  it("erkennt die Ganze-Zeile-Auswahl über Tabelle/Alias", () => {
    expect(selectsWholeRow("SELECT u FROM users u")).toBe(true);
    expect(selectsWholeRow("SELECT users FROM users")).toBe(true);
    expect(selectsWholeRow("SELECT (u) FROM users AS u")).toBe(true);
    expect(selectsWholeRow("SELECT id, u FROM users u")).toBe(true);
  });
  it("lässt normale Spalten-/Stern-Queries zu", () => {
    expect(selectsWholeRow("SELECT * FROM users")).toBe(false);
    expect(selectsWholeRow("SELECT id, name FROM users u")).toBe(false);
    expect(selectsWholeRow("SELECT u.name FROM users u")).toBe(false);
    expect(selectsWholeRow("SELECT count(*) FROM users")).toBe(false);
  });
});

describe("assertAdminQuery — Ganze-Zeile-/Row-Serialisierungs-Leak", () => {
  it("sperrt Row-Serialisierer, die eine Zeile in einen Wert packen", () => {
    for (const q of [
      "SELECT to_jsonb(u) FROM users u",
      "SELECT row_to_json(u) FROM users u",
      "SELECT jsonb_agg(u) FROM users u",
      "SELECT to_json(u) FROM users u",
    ]) {
      expect(() => assertAdminQuery(q, ALL)).toThrow(UnsafeQueryError);
    }
  });
  it("sperrt die bloße Ganze-Zeile-Auswahl", () => {
    expect(() => assertAdminQuery("SELECT u FROM users u", ALL)).toThrow(
      UnsafeQueryError,
    );
    expect(() => assertAdminQuery("SELECT users FROM users", ALL)).toThrow(
      UnsafeQueryError,
    );
  });
  it("lässt reguläre Lese-Queries unangetastet", () => {
    expect(assertAdminQuery("SELECT id, name FROM users", ALL)).toBe("read");
    expect(assertAdminQuery("SELECT * FROM characters c", ALL)).toBe("read");
  });
});
