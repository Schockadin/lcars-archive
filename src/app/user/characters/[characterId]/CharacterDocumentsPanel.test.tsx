import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CharacterDocumentsPanel from "./CharacterDocumentsPanel";

vi.mock("./documentActions", () => ({
  uploadCharacterDocumentAction: vi.fn(async () => ({})),
  deleteCharacterDocumentAction: vi.fn(async () => ({})),
  renameCharacterDocumentAction: vi.fn(async () => ({})),
}));

const longName =
  "Ausführlicher Bericht über die gesamte Forschungsmission der U.S.S. Beispiel.pdf";

describe("CharacterDocumentsPanel", () => {
  it("zeigt einen gekürzten Namen und öffnet die Umbenennung mit dem vollständigen Namen", () => {
    render(
      <CharacterDocumentsPanel
        characterId={4}
        documents={[
          {
            id: 7,
            characterId: 4,
            fileName: longName,
            kind: "pdf",
            sizeBytes: 1234,
            createdAt: "2026-09-25",
            previewUrl: "/preview",
            downloadUrl: "/download",
          },
        ]}
      />,
    );

    expect(screen.queryByText(longName)).not.toBeInTheDocument();
    expect(screen.getByTitle(longName).textContent).toMatch(/…\.pdf$/);

    fireEvent.click(
      screen.getByRole("button", {
        name: `Dokument „${longName}“ umbenennen`,
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "Dokument umbenennen" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Dateiname")).toHaveValue(longName);
    expect(
      screen.getByRole("button", { name: "Dateiname speichern" }),
    ).toBeVisible();
  });
});
