import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GameSession } from "@/lib/gameSessions";

vi.mock("@/lib/dal", () => ({ requireGM: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/characters", () => ({ getCharactersForParticipantPicker: vi.fn(async () => []) }));
vi.mock("@/lib/missions", () => ({ getMissionBySlug: vi.fn(), getMissionParticipantIds: vi.fn(async () => []) }));
vi.mock("@/lib/contentRevisions", () => ({ listRevisions: vi.fn(async () => []) }));
vi.mock("@/lib/visibility", () => ({ getViewer: vi.fn(async () => ({})) }));
vi.mock("@/lib/gameSessions", () => ({ listGameSessions: vi.fn(), listMissionSynopsisBlocks: vi.fn(async () => []) }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/app/_shared/RevisionsPanel", () => ({ default: () => null }));
vi.mock("./MissionSummaryBlocks", () => ({ default: () => null }));
vi.mock("./MissionContentEditor", () => ({ default: () => <p>Missionseditor</p> }));

import { getMissionBySlug } from "@/lib/missions";
import { listGameSessions } from "@/lib/gameSessions";
import GmMissionDetailPage from "./page";

describe("GM-Missionsdetailseite", () => {
  it("verlinkt nur ihre eigenen Sessions als Karten auf die Session-Detailseiten", async () => {
    vi.mocked(getMissionBySlug).mockResolvedValue({
      id: 1, slug: "deneb", title: "Deneb IV", status: "active", started_at: null, ended_at: null, isDraft: false,
    } as NonNullable<Awaited<ReturnType<typeof getMissionBySlug>>>);
    const session: GameSession = {
      id: 7, title: "Deneb IV 2", sessionDate: "2026-09-20", missionId: 1,
      missionTitle: "Deneb IV", missionSlug: "deneb", missionSessionNumber: 2,
      sessionAp: 3, bonusAp: 1, createdByName: "GM", createdAt: "2026-09-20",
      characterCount: 1, totalAp: 4, characterIds: [2], synopsisBlocks: [],
    };
    vi.mocked(listGameSessions).mockResolvedValue([session, { ...session, id: 8, missionId: 2, title: "Andere Mission 1" }]);
    const { container } = render(await GmMissionDetailPage({ params: Promise.resolve({ slug: "deneb" }) }));
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Deneb IV 2" })).toHaveAttribute("href", "/gm/sessions/7");
    expect(screen.queryByText("Andere Mission 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Session speichern" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mission ansehen" })).toHaveAttribute("href", "/chronologie/mission/deneb");
    expect(screen.getByText("Missionseditor")).toBeInTheDocument();
  });
});
