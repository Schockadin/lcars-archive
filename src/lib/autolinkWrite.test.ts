import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMissionSynopsisBlockMarkdown: vi.fn(),
  revalidateMission: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/characters", () => ({ updateCharacterBio: vi.fn() }));
vi.mock("@/lib/missions", () => ({
  updateMissionSynopsisWithHtml: vi.fn(),
  updateMissionLogSourceMd: vi.fn(),
}));
vi.mock("@/lib/archive", () => ({ updateArchiveEntryContent: vi.fn() }));
vi.mock("@/lib/gameSessions", () => ({
  updateMissionSynopsisBlockMarkdown: mocks.updateMissionSynopsisBlockMarkdown,
}));
vi.mock("@/lib/revalidate", () => ({
  revalidateMission: mocks.revalidateMission,
}));

import { saveAutolinkedContent } from "./autolinkWrite";

describe("saveAutolinkedContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMissionSynopsisBlockMarkdown.mockResolvedValue(true);
  });

  it("speichert Synopsis-Blöcke und revalidiert die übergeordnete Mission", async () => {
    await saveAutolinkedContent(
      {
        contentType: "missionSynopsisBlock",
        id: 30,
        slug: "eigene-mission",
        missionId: 12,
      },
      "Verlinkter Synopsis-Text",
      "<p>Verlinkter Synopsis-Text</p>",
    );

    expect(mocks.updateMissionSynopsisBlockMarkdown).toHaveBeenCalledWith(
      30,
      12,
      "Verlinkter Synopsis-Text",
    );
    expect(mocks.revalidateMission).toHaveBeenCalledWith("eigene-mission");
  });
});
