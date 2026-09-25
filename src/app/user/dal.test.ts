import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifySession,
  getUserWithPasswordStatus,
  getCharactersForUser,
  redirect,
  forbidden,
} = vi.hoisted(() => ({
  verifySession: vi.fn(),
  getUserWithPasswordStatus: vi.fn(),
  getCharactersForUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error("redirect:" + path);
  }),
  forbidden: vi.fn(() => {
    throw new Error("forbidden");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect, forbidden }));
vi.mock("@/lib/dal", () => ({ verifySession }));
vi.mock("@/lib/users", () => ({ getUserWithPasswordStatus }));
vi.mock("@/lib/characters", () => ({ getCharactersForUser }));

import { requireOwnCharacters } from "./dal";

describe("requireOwnCharacters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prüft zuerst die Session und lädt danach beide eigenen Datensätze parallel", async () => {
    const order: string[] = [];
    verifySession.mockImplementation(async () => {
      order.push("session");
      return { userId: 17 };
    });
    getUserWithPasswordStatus.mockImplementation(async () => {
      order.push("user");
      return { id: 17 };
    });
    getCharactersForUser.mockImplementation(async () => {
      order.push("characters");
      return [{ id: 4 }];
    });

    const result = await requireOwnCharacters();

    expect(order).toEqual(["session", "user", "characters"]);
    expect(getUserWithPasswordStatus).toHaveBeenCalledWith(17);
    expect(getCharactersForUser).toHaveBeenCalledWith(17);
    expect(result).toEqual({ user: { id: 17 }, characters: [{ id: 4 }] });
  });

  it("leitet ein gültig angemeldetes, aber gelöschtes Konto weiterhin zum Login um", async () => {
    verifySession.mockResolvedValue({ userId: 17 });
    getUserWithPasswordStatus.mockResolvedValue(null);
    getCharactersForUser.mockResolvedValue([]);

    await expect(requireOwnCharacters()).rejects.toThrow("redirect:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
