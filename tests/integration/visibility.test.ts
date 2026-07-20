import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import {
  canView,
  canViewDraft,
  canViewMissionDraft,
  canSetVisibility,
  getViewer,
  type Viewer,
} from "@/lib/visibility";
import { createSession } from "@/lib/session";
import { insertUser } from "./helpers";

// getSession()/getViewer() hängen an next/headers' cookies() — in einem
// echten Next-Request kommt die per Middleware/RSC-Kontext, hier simuliert
// per In-Memory-Store, damit createSession()/getSession() im echten
// Zusammenspiel getestet werden (statt die interne Sign/Encode-Logik
// nachzubauen). Der Store lebt außerhalb der Factory (vi.hoisted), damit ein
// beforeEach ihn zwischen Tests leeren kann — sonst würde ein in einem Test
// gesetztes Cookie in den nächsten durchsickern.
const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
}));

beforeEach(() => {
  cookieStore.clear();
});

describe("canView", () => {
  const admin: Viewer = { userId: 1, role: "admin" };
  const gm: Viewer = { userId: 2, role: "gm" };
  const player: Viewer = { userId: 3, role: "player" };
  const owner: Viewer = { userId: 4, role: "player" };

  it("lets anyone see public content, even anonymous viewers", () => {
    expect(canView("public", null, null)).toBe(true);
    expect(canView("public", 4, player)).toBe(true);
  });

  it("lets an admin see private content they don't own", () => {
    expect(canView("private", 4, admin)).toBe(true);
  });

  it("lets the owner see their own private content", () => {
    expect(canView("private", 4, owner)).toBe(true);
  });

  it("does not let a non-owning, non-admin player see private content", () => {
    expect(canView("private", 4, player)).toBe(false);
  });

  it("does not let an anonymous viewer see private content", () => {
    expect(canView("private", 4, null)).toBe(false);
  });

  it("lets gm and admin see gm-visibility content, but not a plain player", () => {
    expect(canView("gm", 4, gm)).toBe(true);
    expect(canView("gm", 4, admin)).toBe(true);
    expect(canView("gm", 4, player)).toBe(false);
  });
});

describe("canViewDraft", () => {
  const admin: Viewer = { userId: 1, role: "admin" };
  const gm: Viewer = { userId: 2, role: "gm" };
  const player: Viewer = { userId: 3, role: "player" };
  const owner: Viewer = { userId: 4, role: "player" };

  it("lets anyone see non-draft content regardless of viewer", () => {
    expect(canViewDraft(false, 4, null)).toBe(true);
    expect(canViewDraft(false, 4, player)).toBe(true);
  });

  it("lets the owner see their own draft", () => {
    expect(canViewDraft(true, 4, owner)).toBe(true);
  });

  it("does NOT let an admin see a draft they don't own, unlike canView", () => {
    expect(canViewDraft(true, 4, admin)).toBe(false);
  });

  it("does NOT let a gm see a draft they don't own", () => {
    expect(canViewDraft(true, 4, gm)).toBe(false);
  });

  it("does not let a non-owning player see a draft", () => {
    expect(canViewDraft(true, 4, player)).toBe(false);
  });

  it("does not let an anonymous viewer see a draft", () => {
    expect(canViewDraft(true, 4, null)).toBe(false);
  });

  it("returns false when there is no owner to match against, even for the same userId coincidentally matching null", () => {
    expect(canViewDraft(true, null, owner)).toBe(false);
  });
});

describe("canViewMissionDraft", () => {
  const admin: Viewer = { userId: 1, role: "admin" };
  const gm: Viewer = { userId: 2, role: "gm" };
  const player: Viewer = { userId: 3, role: "player" };

  it("lets anyone see a non-draft mission regardless of viewer", () => {
    expect(canViewMissionDraft(false, null)).toBe(true);
    expect(canViewMissionDraft(false, player)).toBe(true);
  });

  it("lets ANY gm or admin see a mission draft, not just the creator, unlike canViewDraft", () => {
    expect(canViewMissionDraft(true, gm)).toBe(true);
    expect(canViewMissionDraft(true, admin)).toBe(true);
  });

  it("does not let a plain player see a mission draft", () => {
    expect(canViewMissionDraft(true, player)).toBe(false);
  });

  it("does not let an anonymous viewer see a mission draft", () => {
    expect(canViewMissionDraft(true, null)).toBe(false);
  });
});

describe("canSetVisibility", () => {
  it("only lets the owner change visibility, not admin/gm/anonymous", () => {
    const owner: Viewer = { userId: 4, role: "player" };
    const admin: Viewer = { userId: 1, role: "admin" };

    expect(canSetVisibility(4, owner)).toBe(true);
    expect(canSetVisibility(4, admin)).toBe(false);
    expect(canSetVisibility(4, null)).toBe(false);
  });

  it("returns false when there is no owner to match against", () => {
    const owner: Viewer = { userId: 4, role: "player" };
    expect(canSetVisibility(null, owner)).toBe(false);
  });
});

describe("getViewer", () => {
  it("returns null when there is no session cookie", async () => {
    const result = await getViewer();
    expect(result).toBeNull();
  });

  it("resolves the session's user fresh from the DB", async () => {
    const user = await insertUser({ role: "gm" });
    await createSession({ id: user.id, email: user.email, role: "gm", session_version: 0 });

    const result = await getViewer();

    expect(result).toEqual({ userId: user.id, role: "gm" });
  });

  it("returns null when the session references a user that no longer exists", async () => {
    await createSession({ id: 999999, email: "ghost@example.test", role: "player", session_version: 0 });

    const result = await getViewer();

    expect(result).toBeNull();
  });

  it("reflects the user's CURRENT role from the DB, not the stale session payload", async () => {
    const user = await insertUser({ role: "player" });
    await createSession({ id: user.id, email: user.email, role: "player", session_version: 0 });

    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;

    const result = await getViewer();

    expect(result?.role).toBe("admin");
  });
});
