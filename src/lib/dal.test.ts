import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserById: vi.fn(),
  getRoleMap: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/users", () => ({ getUserById: mocks.getUserById }));
vi.mock("@/lib/roles", () => ({ getRoleMap: mocks.getRoleMap }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));

import { getCurrentUser, verifySession } from "./dal";

const session = { userId: 7, sessionVersion: 3 };
const user = { id: 7, is_active: true, session_version: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(session);
  mocks.getUserById.mockResolvedValue(user);
});

describe("verbindliche Session-Gates", () => {
  it("liefert eine aktive, unveränderte Sitzung und ihren User", async () => {
    await expect(verifySession()).resolves.toBe(session);
    await expect(getCurrentUser()).resolves.toBe(user);
  });

  it("weist fehlende Cookies vor dem DB-Zugriff ab", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(verifySession()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });

  it.each([
    ["gelöschte Konten", null],
    ["deaktivierte Konten", { ...user, is_active: false }],
    ["widerrufene Cookies", { ...user, session_version: 4 }],
  ])(
    "weist %s auch ohne vorheriges Seiten-Gate ab",
    async (_label, current) => {
      mocks.getUserById.mockResolvedValue(current);
      await expect(verifySession()).rejects.toThrow("REDIRECT:/login");
      await expect(getCurrentUser()).rejects.toThrow("REDIRECT:/login");
    },
  );
});
