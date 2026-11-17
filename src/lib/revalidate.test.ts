import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";
import { cacheTags } from "./cacheTags";
import {
  revalidateContentImageLists,
  revalidateMission,
  revalidateCharacter,
  revalidateLog,
  revalidateArchiveEntry,
  revalidateTimeline,
  revalidateAllContent,
} from "./revalidate";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

describe("Invalidierung der öffentlichen Chronologie", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    "character",
    "mission",
    "mission_log",
    "archive_entry",
    "timeline_event",
  ] as const)("erneuert Vorschaubilder für %s", (type) => {
    const tags = revalidateContentImageLists(type);
    expect(tags).toContain(cacheTags.timeline);
    expect(tags).toContain(cacheTags.contentImages);
    expect(revalidateTag).toHaveBeenCalledWith(cacheTags.timeline, {
      expire: 0,
    });
    if (type === "character") expect(tags).toContain(cacheTags.characters);
    if (type === "archive_entry") expect(tags).toContain(cacheTags.archive);
  });

  it("verwirft bei Quellen und freien Ereignissen die von getTimeline gelesenen Tags", () => {
    expect(revalidateMission("eins")).toContain(cacheTags.missions);
    expect(revalidateCharacter("figur")).toContain(cacheTags.characters);
    expect(revalidateLog(1, "log")).toContain(cacheTags.missionLogs);
    expect(revalidateArchiveEntry("ort")).toContain(cacheTags.archive);
    expect(revalidateTimeline()).toContain(cacheTags.timeline);
  });

  it("verwirft bei einem vollständigen DB-Restore auch Bildvarianten und negative Bild-Caches", () => {
    expect(revalidateAllContent()).toContain(cacheTags.contentImages);
    expect(revalidateTag).toHaveBeenCalledWith(cacheTags.contentImages, {
      expire: 0,
    });
  });
});
