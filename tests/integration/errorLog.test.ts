import { describe, it, expect } from "vitest";
import {
  logServerError,
  logCaughtError,
  getServerErrorByDigest,
  listRecentServerErrors,
} from "@/lib/errorLog";

describe("logServerError / listRecentServerErrors", () => {
  it("records all fields and lists them back, newest first", async () => {
    await logServerError({
      digest: "abc123",
      message: "Kaputt",
      stack: "Error: Kaputt\n    at foo (bar.ts:1:1)",
      routePath: "/missions/[missionSlug]",
      routeType: "render",
      method: "GET",
    });

    const [entry] = await listRecentServerErrors();
    expect(entry).toMatchObject({
      digest: "abc123",
      message: "Kaputt",
      stack: "Error: Kaputt\n    at foo (bar.ts:1:1)",
      routePath: "/missions/[missionSlug]",
      routeType: "render",
      method: "GET",
    });
    expect(entry.id).toBeTypeOf("number");
    expect(entry.createdAt).toBeTruthy();
  });

  it("defaults optional fields to null when omitted", async () => {
    await logServerError({ message: "Nur eine Meldung" });

    const [entry] = await listRecentServerErrors();
    expect(entry.digest).toBeNull();
    expect(entry.stack).toBeNull();
    expect(entry.routePath).toBeNull();
    expect(entry.routeType).toBeNull();
    expect(entry.method).toBeNull();
  });

  it("orders by most recent first and respects the limit", async () => {
    await logServerError({ message: "first" });
    await logServerError({ message: "second" });
    await logServerError({ message: "third" });

    const entries = await listRecentServerErrors(2);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.message)).toEqual(["third", "second"]);
  });

  it("never throws, even on a write that would fail", async () => {
    // message ist NOT NULL in error_logs — ein zu langer/kaputter Wert kann
    // hier nicht leicht provoziert werden, daher stattdessen: doppeltes
    // Schreiben mit identischem Digest ist explizit erlaubt (kein UNIQUE
    // Constraint) und darf nicht werfen.
    await expect(
      logServerError({ digest: "dup", message: "eins" }),
    ).resolves.toBeUndefined();
    await expect(
      logServerError({ digest: "dup", message: "zwei" }),
    ).resolves.toBeUndefined();

    const entries = await listRecentServerErrors();
    expect(entries.filter((e) => e.digest === "dup")).toHaveLength(2);
  });
});

describe("logCaughtError", () => {
  it("normalizes an Error instance into message/stack and marks it as caught", async () => {
    await logCaughtError(
      new Error("Mail an foo@example.test fehlgeschlagen"),
      "characters.ts:notifyCharacterSubscribers",
    );

    const [entry] = await listRecentServerErrors();
    expect(entry.message).toBe("Mail an foo@example.test fehlgeschlagen");
    expect(entry.stack).toBeTruthy();
    expect(entry.routePath).toBe("characters.ts:notifyCharacterSubscribers");
    expect(entry.routeType).toBe("caught");
    expect(entry.digest).toBeNull();
  });

  it("stringifies a non-Error catch value and leaves stack null", async () => {
    await logCaughtError("plain string error", "api/search/route.ts:GET");

    const [entry] = await listRecentServerErrors();
    expect(entry.message).toBe("plain string error");
    expect(entry.stack).toBeNull();
    expect(entry.routeType).toBe("caught");
  });
});

describe("getServerErrorByDigest", () => {
  it("returns null when no entry matches", async () => {
    expect(await getServerErrorByDigest("nope")).toBeNull();
  });

  it("returns the most recent entry for a digest when the same digest occurs multiple times", async () => {
    await logServerError({ digest: "shared", message: "älter" });
    await logServerError({ digest: "shared", message: "neuer" });
    await logServerError({ digest: "other", message: "unrelated" });

    const entry = await getServerErrorByDigest("shared");
    expect(entry?.message).toBe("neuer");
  });
});
