import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheLife, cacheTag } from "next/cache";
import { getTimeline } from "./timeline";
import { cacheTags } from "./cacheTags";

vi.mock("@/lib/db", () => ({ default: vi.fn(async () => []) }));
vi.mock("@/lib/contentImages", () => ({
  getFirstContentImageIdsBySlug: vi.fn(async () => new Map()),
}));
vi.mock("@/lib/characterPortraitThumbnails", () => ({
  characterPortraitThumbnailSrc: (_slug: string, src: string) => src,
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

describe("öffentlicher Timeline-Cache", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([true, false])(
    "hängt die Detailvariante %s an sämtliche veränderlichen Quellen",
    async (renderManualDetails) => {
      expect(await getTimeline({ renderManualDetails })).toEqual([]);
      expect(cacheLife).toHaveBeenCalledWith("hours");
      const tags = vi.mocked(cacheTag).mock.calls.flat();
      expect(tags).toEqual(
        expect.arrayContaining([
          cacheTags.timeline,
          cacheTags.characters,
          cacheTags.missions,
          cacheTags.missionLogs,
          cacheTags.archive,
        ]),
      );
    },
  );
});
