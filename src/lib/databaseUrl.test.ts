import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./databaseUrl";

describe("resolveDatabaseUrl", () => {
  it("uses the active Netlify Database branch when enabled", () => {
    expect(
      resolveDatabaseUrl(
        true,
        "postgres://railway/production",
        () => "postgres://netlify/branch",
      ),
    ).toBe("postgres://netlify/branch");
  });

  it("uses DATABASE_URL when Netlify Database is disabled", () => {
    expect(
      resolveDatabaseUrl(
        false,
        "postgres://railway/production",
        () => "postgres://netlify/branch",
      ),
    ).toBe("postgres://railway/production");
  });

  it("fails clearly when neither connection is configured", () => {
    expect(() => resolveDatabaseUrl(false, undefined, () => "unused")).toThrow(
      "DATABASE_URL is not set",
    );
  });

  it("does not fall back to Railway if the Netlify URL is missing", () => {
    expect(
      () =>
        resolveDatabaseUrl(true, "postgres://railway/production", () => {
          throw new Error("NETLIFY_DB_URL is not set");
        }),
    ).toThrow("NETLIFY_DB_URL is not set");
  });
});
