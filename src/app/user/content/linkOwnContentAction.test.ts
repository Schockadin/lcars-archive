import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveUser: vi.fn(),
  getAutolinkTargets: vi.fn(),
  getOwnAutolinkableContent: vi.fn(),
  applyAutolinks: vi.fn(),
  renderAutolinkedHtml: vi.fn(),
  saveAutolinkedContent: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({ getActiveUser: mocks.getActiveUser }));
vi.mock("@/lib/autolink", () => ({
  getAutolinkTargets: mocks.getAutolinkTargets,
  getOwnAutolinkableContent: mocks.getOwnAutolinkableContent,
  applyAutolinks: mocks.applyAutolinks,
  renderAutolinkedHtml: mocks.renderAutolinkedHtml,
}));
vi.mock("@/lib/autolinkWrite", () => ({
  saveAutolinkedContent: mocks.saveAutolinkedContent,
}));

import { linkOwnContentBatchAction } from "./linkOwnContentAction";

describe("linkOwnContentBatchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAutolinkTargets.mockResolvedValue([
      {
        type: "character",
        slug: "eigener-charakter",
        canonical: "Eigener Charakter",
        phrases: ["Eigener Charakter"],
        href: "/characters/eigener-charakter",
      },
      {
        type: "character",
        slug: "anderer-charakter",
        canonical: "Anderer Charakter",
        phrases: ["Anderer Charakter"],
        href: "/characters/anderer-charakter",
      },
    ]);
    mocks.getOwnAutolinkableContent.mockResolvedValue([
      {
        contentType: "character",
        id: 10,
        slug: "eigener-charakter",
        missionId: null,
        sourceMd: "Text",
      },
      {
        contentType: "archiveEntry",
        id: 20,
        slug: "eigener-eintrag",
        missionId: null,
        sourceMd: "Text",
      },
    ]);
    mocks.applyAutolinks.mockReturnValue({
      sourceMd: "Verlinkter Text",
      matches: [
        {
          type: "character",
          canonical: "Anderer Charakter",
          href: "/characters/anderer-charakter",
          matchedText: "Anderer Charakter",
        },
      ],
    });
    mocks.renderAutolinkedHtml.mockResolvedValue("<p>Verlinkter Text</p>");
    mocks.saveAutolinkedContent.mockResolvedValue(undefined);
  });

  it("verlangt ein aktives Konto, bevor Inhalte geladen werden", async () => {
    mocks.getActiveUser.mockResolvedValue(null);

    await expect(linkOwnContentBatchAction(0, 15)).resolves.toEqual({
      error: "Bitte melde dich an.",
    });
    expect(mocks.getOwnAutolinkableContent).not.toHaveBeenCalled();
  });

  it("verarbeitet einen Block nur mit der User-ID aus der aktiven Sitzung", async () => {
    mocks.getActiveUser.mockResolvedValue({ id: 7 });

    const result = await linkOwnContentBatchAction(0, 1);

    expect(mocks.getOwnAutolinkableContent).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      total: 2,
      processed: 1,
      changedInBatch: 1,
      linksInBatch: 1,
      done: false,
    });
    expect(mocks.applyAutolinks).toHaveBeenCalledWith("Text", [
      expect.objectContaining({ slug: "anderer-charakter" }),
    ]);
    expect(mocks.saveAutolinkedContent).toHaveBeenCalledTimes(1);
    expect(mocks.saveAutolinkedContent).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "eigener-charakter" }),
      "Verlinkter Text",
      "<p>Verlinkter Text</p>",
    );
  });
});
