import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkPermission: vi.fn(),
  getAllAutolinkableContent: vi.fn(),
  renderContentHtml: vi.fn(),
  applyGermanTypography: vi.fn(),
  saveAutolinkedContent: vi.fn(),
  publishContentChanged: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({ checkPermission: mocks.checkPermission }));
vi.mock("@/lib/autolink", () => ({
  getAllAutolinkableContent: mocks.getAllAutolinkableContent,
  renderContentHtml: mocks.renderContentHtml,
}));
vi.mock("@/lib/typography", () => ({
  applyGermanTypography: mocks.applyGermanTypography,
}));
vi.mock("@/lib/autolinkWrite", () => ({
  saveAutolinkedContent: mocks.saveAutolinkedContent,
}));
vi.mock("@/lib/realtimeServer", () => ({
  publishContentChanged: mocks.publishContentChanged,
}));

import { typographyFixBatchAction } from "./typographyFix";

describe("typographyFixBatchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkPermission.mockResolvedValue({});
    mocks.getAllAutolinkableContent.mockResolvedValue([
      {
        contentType: "missionSynopsisBlock",
        id: 30,
        slug: "eigene-mission",
        missionId: 12,
        sourceMd: "‘Text der Synopsis´",
      },
    ]);
    mocks.applyGermanTypography.mockReturnValue("'Text der Synopsis'");
    mocks.renderContentHtml.mockResolvedValue("<p>Text der Synopsis</p>");
    mocks.saveAutolinkedContent.mockResolvedValue(undefined);
    mocks.publishContentChanged.mockResolvedValue(undefined);
  });

  it("korrigiert Synopsis-Blöcke über den gemeinsamen Schreibpfad", async () => {
    const result = await typographyFixBatchAction(0, 15);

    expect(result).toEqual({
      total: 1,
      processed: 1,
      changedInBatch: 1,
      done: true,
    });
    expect(mocks.saveAutolinkedContent).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "missionSynopsisBlock", id: 30 }),
      "'Text der Synopsis'",
      "<p>Text der Synopsis</p>",
    );
    expect(mocks.publishContentChanged).toHaveBeenCalledOnce();
  });
});
