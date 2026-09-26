import { beforeEach, describe, expect, it, vi } from "vitest";

// redirect() wirft in Next einen Kontrollfluss-Fehler — hier nachgebildet,
// damit sich „leitet um" als geworfener Fehler prüfen lässt.
const { redirect, forbidden, verifySession, getUserWithPasswordStatus } =
  vi.hoisted(() => ({
    redirect: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    forbidden: vi.fn(() => {
      throw new Error("FORBIDDEN");
    }),
    verifySession: vi.fn(),
    getUserWithPasswordStatus: vi.fn(),
  }));

vi.mock("next/navigation", () => ({ redirect, forbidden }));
vi.mock("@/lib/dal", () => ({ verifySession }));
vi.mock("@/lib/users", () => ({ getUserWithPasswordStatus }));
vi.mock("@/lib/characters", () => ({
  getCharactersForUser: vi.fn(async () => []),
}));

import { requireOwnCharacters, requireOwnGM, requireOwnUser } from "./dal";

const session = {
  userId: 7,
  email: "a@example.com",
  role: "player",
  expiresAt: Date.now() + 60_000,
  sessionVersion: 3,
};

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    role: "player",
    is_active: true,
    session_version: 3,
    hasPassword: true,
    ...overrides,
  };
}

describe("Gates unter /user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifySession.mockResolvedValue(session);
  });

  it("lässt eine gültige, aktive Sitzung durch", async () => {
    getUserWithPasswordStatus.mockResolvedValue(user());
    await expect(requireOwnUser()).resolves.toMatchObject({ id: 7 });
  });

  it("leitet ein deaktiviertes Konto auf /login um", async () => {
    getUserWithPasswordStatus.mockResolvedValue(user({ is_active: false }));
    await expect(requireOwnUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("verwirft ein Cookie aus der Zeit vor dem letzten Passwortwechsel", async () => {
    getUserWithPasswordStatus.mockResolvedValue(user({ session_version: 4 }));
    await expect(requireOwnUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("leitet um, wenn das Konto nicht mehr existiert", async () => {
    getUserWithPasswordStatus.mockResolvedValue(null);
    await expect(requireOwnUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("prüft dieselbe Frische auch für requireOwnCharacters", async () => {
    getUserWithPasswordStatus.mockResolvedValue(user({ is_active: false }));
    await expect(requireOwnCharacters()).rejects.toThrow("REDIRECT:/login");
  });

  it("prüft dieselbe Frische auch für requireOwnGM", async () => {
    getUserWithPasswordStatus.mockResolvedValue(
      user({ role: "gm", session_version: 2 }),
    );
    await expect(requireOwnGM()).rejects.toThrow("REDIRECT:/login");
  });

  it("weist eine aktive Nicht-Spielleitung bei requireOwnGM ab", async () => {
    getUserWithPasswordStatus.mockResolvedValue(user());
    await expect(requireOwnGM()).rejects.toThrow("FORBIDDEN");
  });
});
