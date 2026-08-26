import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "./proxy";
import {
  SESSION_COOKIE_NAME,
  encodeSessionToken,
  type SessionPayload,
} from "@/lib/sessionToken";

function validToken(): string {
  const payload: SessionPayload = {
    userId: 7,
    email: "riker@example.com",
    role: "player",
    expiresAt: Date.now() + 60_000,
    sessionVersion: 1,
  };
  return encodeSessionToken(payload);
}

function request(path: string, token?: string): NextRequest {
  const req = new NextRequest(new URL(`https://example.com${path}`));
  if (token !== undefined) {
    req.cookies.set(SESSION_COOKIE_NAME, token);
  }
  return req;
}

function locationOf(res: Response): string | null {
  const loc = res.headers.get("location");
  return loc ? new URL(loc).pathname : null;
}

describe("proxy (auth guard)", () => {
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

  it("lets an authenticated user through to a protected route", () => {
    const res = proxy(request("/user", validToken()));
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets an authenticated user through to a protected sub-route", () => {
    const res = proxy(request("/admin/users", validToken()));
    expect(res.headers.get("location")).toBeNull();
  });

  it.each(["/user", "/user/content", "/admin", "/admin/db", "/users", "/users/5"])(
    "redirects anonymous visitors from %s to /login",
    (path) => {
      const res = proxy(request(path));
      expect(locationOf(res)).toBe("/login");
    },
  );

  it("redirects when the session cookie is present but invalid", () => {
    const res = proxy(request("/user", "garbage.token"));
    expect(locationOf(res)).toBe("/login");
  });

  it("redirects when the session cookie is expired", () => {
    const expired = encodeSessionToken({
      userId: 7,
      email: "riker@example.com",
      role: "player",
      expiresAt: Date.now() - 1,
      sessionVersion: 1,
    });
    const res = proxy(request("/user", expired));
    expect(locationOf(res)).toBe("/login");
  });

  it("strips any query string from the login redirect", () => {
    const res = proxy(request("/user/content?tab=missions"));
    const loc = res.headers.get("location");
    expect(loc).not.toBeNull();
    expect(new URL(loc as string).search).toBe("");
  });

  it.each(["/", "/login", "/archive", "/missions", "/changelog", "/userxyz"])(
    "does not touch public route %s",
    (path) => {
      const res = proxy(request(path));
      expect(res.headers.get("location")).toBeNull();
    },
  );

  it("only matches the three protected areas", () => {
    expect(config.matcher).toEqual([
      "/user/:path*",
      "/admin/:path*",
      "/users/:path*",
    ]);
  });
});
