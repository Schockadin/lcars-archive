import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameSession } from "@/lib/gameSessions";

vi.mock("@/lib/dal", () => ({ requireGM: vi.fn() }));
vi.mock("@/lib/gameSessions", () => ({
  getGameSession: vi.fn(), listCharactersForSessionEdit: vi.fn(), listSessionMissions: vi.fn(), listGameSessions: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("../SessionManager", () => ({ SessionDetails: ({ session }: { session: GameSession }) => <p>Log-Einträge für {session.id}</p> }));

import { requireGM } from "@/lib/dal";
import { getGameSession, listCharactersForSessionEdit, listSessionMissions, listGameSessions } from "@/lib/gameSessions";
import GmSessionDetailPage from "./page";

const SESSION: GameSession = {
  id: 7, title: "Deneb IV 2", sessionDate: "2026-09-20", missionId: 1,
  missionTitle: "Deneb IV", missionSlug: "deneb", missionSessionNumber: 2,
  sessionAp: 3, bonusAp: 1, createdByName: "GM", createdAt: "2026-09-20",
  characterCount: 1, totalAp: 4, characterIds: [2], synopsisBlocks: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGM).mockResolvedValue({ id: 1 } as Awaited<ReturnType<typeof requireGM>>);
  vi.mocked(getGameSession).mockResolvedValue(SESSION);
  vi.mocked(listCharactersForSessionEdit).mockResolvedValue([
    { id: 2, name: "T'Lara", playerName: "Spielerin" },
    { id: 3, name: "Nicht beteiligt", playerName: null },
  ]);
  vi.mocked(listSessionMissions).mockResolvedValue([]);
  vi.mocked(listGameSessions).mockResolvedValue([]);
});

describe("Session-Detailseite", () => {
  it("zeigt Session, Teilnehmende, AP und Links zur Mission", async () => {
    render(await GmSessionDetailPage({ params: Promise.resolve({ id: "7" }) }));
    expect(getGameSession).toHaveBeenCalledWith(7);
    expect(screen.getByRole("heading", { name: "Deneb IV 2" })).toBeInTheDocument();
    expect(screen.getByText("20.09.2026")).toBeInTheDocument();
    expect(screen.getByText("3 + 1 Bonus AP")).toBeInTheDocument();
    expect(screen.getByText("T'Lara")).toBeInTheDocument();
    expect(screen.queryByText("Nicht beteiligt")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mission verwalten" })).toHaveAttribute("href", "/gm/missions/deneb");
    expect(screen.getByText("Log-Einträge für 7")).toBeInTheDocument();
  });

  it.each(["abc", "0", "-1", "1.5", "2147483648"])("weist ungültige IDs zurück: %s", async (id) => {
    await expect(GmSessionDetailPage({ params: Promise.resolve({ id }) })).rejects.toThrow("NOT_FOUND");
    expect(getGameSession).not.toHaveBeenCalled();
  });

  it("antwortet für eine fehlende Session mit 404", async () => {
    vi.mocked(getGameSession).mockResolvedValue(null);
    await expect(GmSessionDetailPage({ params: Promise.resolve({ id: "7" }) })).rejects.toThrow("NOT_FOUND");
    expect(listCharactersForSessionEdit).not.toHaveBeenCalled();
  });

  it("prüft die GM-Berechtigung vor jedem Datenzugriff", async () => {
    vi.mocked(requireGM).mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(GmSessionDetailPage({ params: Promise.resolve({ id: "7" }) })).rejects.toThrow("FORBIDDEN");
    expect(getGameSession).not.toHaveBeenCalled();
  });
});
