import { describe, expect, it } from "vitest";
import {
  buildPgDumpArgs,
  buildPgRestoreArgs,
  getPgDatabaseLabel,
  getPgDatabaseUrl,
} from "./pgDump";

describe("pgDump", () => {
  it("prefers a direct Postgres connection for dumps and restores", () => {
    expect(
      getPgDatabaseUrl({
        DIRECT_DATABASE_URL: "postgresql://direct/db",
        DATABASE_URL: "postgresql://pooled/db",
      }),
    ).toBe("postgresql://direct/db");
  });

  it("falls back to DATABASE_URL and rejects missing or non-Postgres URLs", () => {
    expect(getPgDatabaseUrl({ DATABASE_URL: "postgres://db" })).toBe(
      "postgres://db",
    );
    expect(() => getPgDatabaseUrl({})).toThrow("ist nicht gesetzt");
    expect(() =>
      getPgDatabaseUrl({ DATABASE_URL: "https://example.test" }),
    ).toThrow("PostgreSQL-URL");
  });

  it("hides credentials in the displayed database target", () => {
    expect(
      getPgDatabaseLabel(
        "postgres://admin:secret@db.example.test:5432/archive",
      ),
    ).toBe("archive auf db.example.test:5432");
  });

  it("builds a custom-format full dump command", () => {
    expect(
      buildPgDumpArgs("postgres://db", "C:\\backups\\archive.dump"),
    ).toEqual([
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      "C:\\backups\\archive.dump",
      "--dbname",
      "postgres://db",
    ]);
  });

  it("restores atomically and stops on the first error", () => {
    expect(buildPgRestoreArgs("postgres://db", "archive.dump")).toEqual([
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
      "--single-transaction",
      "--dbname",
      "postgres://db",
      "archive.dump",
    ]);
  });
});
