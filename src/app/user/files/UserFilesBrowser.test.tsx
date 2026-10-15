import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserFilesBrowser from "./UserFilesBrowser";

const getOwnImagesAction = vi.fn();
const importOwnContentImageAction = vi.fn();
vi.mock("./actions", () => ({
  getOwnImagesAction,
  importOwnContentImageAction,
  uploadOwnImageAction: vi.fn(),
  deleteOwnImageAction: vi.fn(),
}));

const image = {
  id: 4,
  fileName: "bruecke.png",
  contentMime: "image/png",
  sizeBytes: 123,
  createdAt: "2026-10-15T12:00:00Z",
  url: "https://assets.example.test/user-images/4.png",
};

const document = {
  id: 8,
  characterName: "Tuvok",
  characterId: 2,
  fileName: "akte.pdf",
  kind: "pdf",
  sizeBytes: 500,
  createdAt: "2026-10-15T12:00:00Z",
  previewUrl: "/api/character-documents/8",
  downloadUrl: "/api/character-documents/8?download=1",
};

describe("UserFilesBrowser", () => {
  it("shows images and character files and filters by file name", () => {
    render(
      <UserFilesBrowser
        initialImages={[image]}
        initialLegacy={[]}
        documents={[document]}
      />,
    );
    expect(screen.getByText("bruecke.png")).toBeInTheDocument();
    expect(screen.getByText("akte.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Herunterladen" })).toHaveAttribute(
      "href",
      document.downloadUrl,
    );

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Dateien suchen" }),
      {
        target: { value: "akte" },
      },
    );
    expect(screen.queryByText("bruecke.png")).not.toBeInTheDocument();
    expect(screen.getByText("akte.pdf")).toBeInTheDocument();
  });

  it("can move an older content image into the reusable library", async () => {
    importOwnContentImageAction.mockResolvedValue({ image });
    getOwnImagesAction.mockResolvedValue({ images: [image], legacy: [] });
    render(
      <UserFilesBrowser
        initialImages={[]}
        initialLegacy={[
          {
            id: 19,
            sourceType: "content",
            previewUrl: "/api/content-images/19",
            contentType: "character",
            contentId: 2,
            contentMime: "image/png",
            sizeBytes: 123,
            createdAt: "2026-10-15T12:00:00Z",
          },
        ]}
        documents={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "In Bibliothek übernehmen" }),
    );
    await waitFor(() =>
      expect(screen.getByText("bruecke.png")).toBeInTheDocument(),
    );
    expect(importOwnContentImageAction).toHaveBeenCalledWith(19, "content");
  });
});
