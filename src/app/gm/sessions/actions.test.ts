import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/dal", () => ({ requireGM: vi.fn(async () => ({ id: 1 })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("REDIRECT"); }) }));
vi.mock("@/lib/gameSessions", () => ({
  createGameSession: vi.fn(), deleteGameSession: vi.fn(), updateGameSession: vi.fn(),
  listActiveCharactersForAp: vi.fn(), listCharactersForSessionEdit: vi.fn(), listSessionMissions: vi.fn(),
}));
vi.mock("@/lib/missions", () => ({ missionSlugExists: vi.fn() }));
vi.mock("@/lib/revalidate", () => ({ revalidateMission: vi.fn() }));
vi.mock("@/lib/plannedSessions", () => ({ getPlannedSession: vi.fn(), linkPlannedSession: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteGameSession, listCharactersForSessionEdit, listSessionMissions, updateGameSession } from "@/lib/gameSessions";
import { deleteSessionAction, updateSessionAction } from "./actions";

beforeEach(() => vi.clearAllMocks());

describe("Session-Detailaktionen", () => {
  it("leitet nach dem Löschen von der Detailseite zur Liste zurück", async () => {
    vi.mocked(deleteGameSession).mockResolvedValue("deneb");
    const form = new FormData();
    form.set("id", "7");
    form.set("returnToSessions", "true");
    await expect(deleteSessionAction({}, form)).rejects.toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/gm/sessions");
    expect(revalidatePath).toHaveBeenCalledWith("/gm/sessions/7", undefined);
  });

  it("bleibt nach einem fehlgeschlagenen Löschen auf der Detailseite", async () => {
    vi.mocked(deleteGameSession).mockResolvedValue(null);
    const form = new FormData();
    form.set("id", "7");
    form.set("returnToSessions", "true");
    expect(await deleteSessionAction({}, form)).toEqual({ error: "Session nicht gefunden." });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("aktualisiert Detailseite und Missionsverwaltung nach dem Speichern", async () => {
    vi.mocked(listSessionMissions).mockResolvedValue([{ id: 1, title: "Deneb IV", slug: "deneb", startedAt: null }]);
    vi.mocked(listCharactersForSessionEdit).mockResolvedValue([{ id: 2, name: "T'Lara", playerName: null }]);
    vi.mocked(updateGameSession).mockResolvedValue({ missionSlug: "deneb", oldMissionSlug: "kestrel", oldMissionId: 3 });
    const form = new FormData();
    for (const [key, value] of Object.entries({ id: "7", missionChoice: "mission:1", sessionDate: "2026-09-20", sessionAp: "3", bonusAp: "1", characterIds: "2" })) form.set(key, value);
    expect(await updateSessionAction({}, form)).toHaveProperty("success");
    expect(listCharactersForSessionEdit).toHaveBeenCalledWith(7);
    expect(updateGameSession).toHaveBeenCalledWith(expect.objectContaining({ id: 7, characterIds: [2] }));
    expect(revalidatePath).toHaveBeenCalledWith("/gm/sessions/7", undefined);
    expect(revalidatePath).toHaveBeenCalledWith("/gm/missions/deneb", undefined);
    expect(revalidatePath).toHaveBeenCalledWith("/gm/missions/kestrel", undefined);
  });
});
