import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import {
  canView,
  canViewMissionDraft,
  canSetContentState,
  contentState,
  isContentState,
  getViewer,
  makeViewer,
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
  const admin: Viewer = makeViewer(1, ["admin"]);
  const gm: Viewer = makeViewer(2, ["gm"]);
  const player: Viewer = makeViewer(3, ["player"]);
  const owner: Viewer = makeViewer(4, ["player"]);

  it("lets anyone see published content, even anonymous viewers", () => {
    expect(canView(false, null, null)).toBe(true);
    expect(canView(false, 4, player)).toBe(true);
  });

  it("lets the owner see their own draft", () => {
    expect(canView(true, 4, owner)).toBe(true);
  });

  it("lets someone who may see everything read a foreign draft", () => {
    // content.view_all — der eine Bypass, den die Administration braucht,
    // um Inhalte auch verwalten zu können.
    expect(canView(true, 4, admin)).toBe(true);
  });

  it("does NOT let a gm see a foreign draft", () => {
    expect(canView(true, 4, gm)).toBe(false);
  });

  it("does not let a non-owning player or an anonymous viewer see a draft", () => {
    expect(canView(true, 4, player)).toBe(false);
    expect(canView(true, 4, null)).toBe(false);
  });

  it("returns false for a draft without an owner to match against", () => {
    expect(canView(true, null, owner)).toBe(false);
  });
});

describe("canViewMissionDraft", () => {
  const admin: Viewer = makeViewer(1, ["admin"]);
  const gm: Viewer = makeViewer(2, ["gm"]);
  const player: Viewer = makeViewer(3, ["player"]);

  it("lets anyone see a published mission regardless of viewer", () => {
    expect(canViewMissionDraft(false, null)).toBe(true);
    expect(canViewMissionDraft(false, player)).toBe(true);
  });

  it("lets ANY gm or admin see a mission draft, not just the creator", () => {
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

describe("canSetContentState", () => {
  it("only lets the owner publish or unpublish, not admin/gm/anonymous", () => {
    const owner: Viewer = makeViewer(4, ["player"]);
    const admin: Viewer = makeViewer(1, ["admin"]);

    expect(canSetContentState(4, owner)).toBe(true);
    expect(canSetContentState(4, admin)).toBe(false);
    expect(canSetContentState(4, null)).toBe(false);
  });

  it("returns false when there is no owner to match against", () => {
    const owner: Viewer = makeViewer(4, ["player"]);
    expect(canSetContentState(null, owner)).toBe(false);
  });
});

describe("contentState", () => {
  it("names the two states", () => {
    expect(contentState(true)).toBe("draft");
    expect(contentState(false)).toBe("published");
    expect(isContentState("draft")).toBe(true);
    expect(isContentState("public")).toBe(false);
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

    expect(result).toEqual(makeViewer(user.id, ["gm"]));
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
