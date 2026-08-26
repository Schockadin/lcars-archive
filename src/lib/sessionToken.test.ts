import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionToken,
  decodeSessionToken,
  type SessionPayload,
} from "./sessionToken";

const BASE: Omit<SessionPayload, "expiresAt"> = {
  userId: 42,
  email: "picard@example.com",
  role: "admin",
  sessionVersion: 3,
};

function makePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    ...BASE,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

describe("sessionToken", () => {
  const previousSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret";
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = previousSecret;
    }
  });

  it("exposes the expected cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("neo_session");
  });

  it("round-trips a valid payload", () => {
    const payload = makePayload();
    const decoded = decodeSessionToken(encodeSessionToken(payload));
    expect(decoded).toEqual(payload);
  });

  it("rejects a token whose signature was tampered with", () => {
    const token = encodeSessionToken(makePayload());
    const [json] = token.split(".");
    const forged = `${json}.deadbeef`;
    expect(decodeSessionToken(forged)).toBeNull();
  });

  it("rejects a token whose payload was swapped but keeps the old signature", () => {
    const token = encodeSessionToken(makePayload({ userId: 1 }));
    const [, signature] = token.split(".");
    const otherJson = Buffer.from(
      JSON.stringify(makePayload({ userId: 999 })),
    ).toString("base64url");
    expect(decodeSessionToken(`${otherJson}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = encodeSessionToken(
      makePayload({ expiresAt: Date.now() - 1 }),
    );
    expect(decodeSessionToken(token)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = encodeSessionToken(makePayload());
    process.env.SESSION_SECRET = "another-secret";
    expect(decodeSessionToken(token)).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    expect(decodeSessionToken("")).toBeNull();
    expect(decodeSessionToken("no-dot")).toBeNull();
    expect(decodeSessionToken("a.b.c")).toBeNull();
  });

  it("throws loudly (not silent null) when SESSION_SECRET is missing", () => {
    // Ein fehlendes Secret ist eine Server-Fehlkonfiguration und soll sichtbar
    // scheitern, statt jede Session still als ungültig zu behandeln (was alle
    // Nutzer:innen app-weit unbemerkt abmelden würde).
    const token = encodeSessionToken(makePayload());
    delete process.env.SESSION_SECRET;
    expect(() => decodeSessionToken(token)).toThrow();
  });
});
