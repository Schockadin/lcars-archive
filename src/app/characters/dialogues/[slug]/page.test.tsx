import { beforeEach, describe, expect, it, vi } from "vitest";

const { getArchiveEntryBySlug, getViewer, canView } = vi.hoisted(() => ({
  getArchiveEntryBySlug: vi.fn(),
  getViewer: vi.fn(),
  canView: vi.fn(),
}));

vi.mock("@/lib/archive", () => ({ getArchiveEntryBySlug }));
vi.mock("@/lib/visibility", () => ({
  getViewer,
  canView,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`REDIRECT:${href}`);
  },
}));

import { getArchiveEntryBySlug as loadEntry } from "@/lib/archive";
import { canView as canViewMock, getViewer as getViewerMock } from "@/lib/visibility";
import CharacterDialoguePage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getViewerMock).mockResolvedValue(null);
  vi.mocked(canViewMock).mockReturnValue(true);
});

describe("alte Gesprächs-URL", () => {
  it("leitet abgeschlossene Gespräche an ihre Archivseite weiter", async () => {
    vi.mocked(loadEntry).mockResolvedValue({
      slug: "archiv-gespraech",
      category: "dialogue",
      dialogue_open: false,
    } as never);

    await expect(
      CharacterDialoguePage({
        params: Promise.resolve({ slug: "archiv-gespraech" }),
      }),
    ).rejects.toThrow("REDIRECT:/archive/archiv-gespraech");
  });

  it("führt offene Gespräche weiter zur Spielansicht", async () => {
    vi.mocked(loadEntry).mockResolvedValue({
      slug: "laufendes-gespraech",
      category: "dialogue",
      dialogue_open: true,
    } as never);

    await expect(
      CharacterDialoguePage({
        params: Promise.resolve({ slug: "laufendes-gespraech" }),
      }),
    ).rejects.toThrow("REDIRECT:/dialogues/laufendes-gespraech");
  });
});
