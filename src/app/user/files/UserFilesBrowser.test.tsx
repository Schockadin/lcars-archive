import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserFilesBrowser from "./UserFilesBrowser";

const {
  getOwnFilesAction,
  importOwnContentImageAction,
  uploadOwnFileAction,
  editOwnFileAction,
  deleteOwnFileAction,
} = vi.hoisted(() => ({
  getOwnFilesAction: vi.fn(),
  importOwnContentImageAction: vi.fn(),
  uploadOwnFileAction: vi.fn(),
  editOwnFileAction: vi.fn(),
  deleteOwnFileAction: vi.fn(),
}));
vi.mock("./actions", () => ({
  getOwnFilesAction,
  importOwnContentImageAction,
  uploadOwnFileAction,
  editOwnFileAction,
  deleteOwnFileAction,
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
  kind: "pdf" as const,
  sizeBytes: 500,
  createdAt: "2026-10-15T12:00:00Z",
  previewUrl: "/api/character-documents/8",
  downloadUrl: "/api/character-documents/8?download=1",
};

const props = {
  initialImages: [image],
  initialLegacy: [],
  initialDocuments: [document],
  initialCharacters: [{ id: 2, name: "Tuvok" }],
  initialLinkedImages: {
    4: [{ label: "Erste Mission", href: "/chronologie/mission/erste-mission" }],
  },
};

describe("UserFilesBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOwnFilesAction.mockResolvedValue({
      images: [image],
      legacy: [],
      documents: [document],
      characters: props.initialCharacters,
      linkedImages: props.initialLinkedImages,
    });
  });

  it("zeigt ChronoRail-Karten und filtert nach Typ und Text", () => {
    const { container } = render(<UserFilesBrowser {...props} />);
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll(".timeline-event")).toHaveLength(2);
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(2);
    expect(screen.getByText("bruecke.png")).toBeInTheDocument();
    expect(screen.getByText("akte.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Erste Mission" })).toHaveAttribute(
      "href",
      "/chronologie/mission/erste-mission",
    );
    expect(screen.getByRole("link", { name: "Tuvok" })).toHaveAttribute(
      "href",
      "/user/characters/2",
    );
    fireEvent.change(screen.getByLabelText("Nach Dateityp filtern"), {
      target: { value: "document" },
    });
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(1);
    expect(screen.queryByText("bruecke.png")).not.toBeInTheDocument();
    expect(screen.getByText("akte.pdf")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Dateien filtern" }),
      {
        target: { value: "fehlend" },
      },
    );
    expect(
      screen.getByText("Keine Dateien für diesen Filter."),
    ).toBeInTheDocument();
  });

  it("sortiert Dateien nach Datum und Name", () => {
    const { container } = render(
      <UserFilesBrowser
        {...props}
        initialDocuments={[{ ...document, createdAt: "2026-10-14T12:00:00Z" }]}
      />,
    );
    expect(
      [...container.querySelectorAll(".timeline-card-title")].map(
        (title) => title.textContent,
      ),
    ).toEqual(["bruecke.png", "akte.pdf"]);

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(
      [...container.querySelectorAll(".timeline-card-title")].map(
        (title) => title.textContent,
      ),
    ).toEqual(["akte.pdf", "bruecke.png"]);

    fireEvent.click(screen.getByRole("button", { name: "Datum" }));
    expect(
      [...container.querySelectorAll(".timeline-card-title")].map(
        (title) => title.textContent,
      ),
    ).toEqual(["bruecke.png", "akte.pdf"]);
  });

  it("öffnet die Vorschau und kann Dokumente umbenennen und lösen", async () => {
    editOwnFileAction.mockResolvedValue({});
    getOwnFilesAction.mockResolvedValue({
      images: [image],
      legacy: [],
      documents: [
        {
          ...document,
          fileName: "neu.pdf",
          characterId: null,
          characterName: null,
        },
      ],
      characters: props.initialCharacters,
      linkedImages: props.initialLinkedImages,
    });
    render(<UserFilesBrowser {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "„akte.pdf“ ansehen" }));
    expect(screen.getByTitle("Vorschau: akte.pdf")).toHaveAttribute(
      "src",
      document.previewUrl,
    );
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
    fireEvent.click(
      screen.getByRole("button", { name: "„akte.pdf“ bearbeiten" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Dateiname" }), {
      target: { value: "neu.pdf" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: /Charakter zuordnen/ }),
      {
        target: { value: "" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() =>
      expect(editOwnFileAction).toHaveBeenCalledWith(
        "document",
        8,
        "neu.pdf",
        null,
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("neu.pdf")).toBeInTheDocument(),
    );
    expect(screen.getByText("Nicht zugeordnet")).toBeInTheDocument();
  });

  it("lädt ein Dokument ohne Charakterzuordnung hoch", async () => {
    uploadOwnFileAction.mockResolvedValue({});
    render(<UserFilesBrowser {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Datei hochladen" }));
    fireEvent.change(screen.getByLabelText("Datei auswählen"), {
      target: {
        files: [new File(["Akte"], "neu.txt", { type: "text/plain" })],
      },
    });
    expect(
      screen.getByRole("combobox", { name: /Charakter zuordnen/ }),
    ).toHaveValue("");
    // jsdom führt die native Gültigkeitsprüfung von Dateifeldern nach einem
    // künstlichen files-Change nicht zuverlässig aus; das Formular direkt senden.
    fireEvent.submit(
      screen
        .getByRole("dialog", { name: "Datei hochladen" })
        .querySelector("form")!,
    );
    await waitFor(() => expect(uploadOwnFileAction).toHaveBeenCalledOnce());
    const data = uploadOwnFileAction.mock.calls[0][0] as FormData;
    expect(data.get("characterId")).toBe("");
    expect((data.get("file") as File).name).toBe("neu.txt");
  });

  it("fordert vor dem Löschen eine Bestätigung", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<UserFilesBrowser {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: "„bruecke.png“ löschen" }),
    );
    expect(confirm).toHaveBeenCalled();
    expect(deleteOwnFileAction).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("übernimmt ältere Inhaltsbilder in die Bibliothek", async () => {
    importOwnContentImageAction.mockResolvedValue({ image });
    render(
      <UserFilesBrowser
        {...props}
        initialImages={[]}
        initialDocuments={[]}
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
      />,
    );
    expect(screen.getByText("Altes Bild #19")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "In Bibliothek übernehmen" }),
    );
    await waitFor(() =>
      expect(screen.getByText("bruecke.png")).toBeInTheDocument(),
    );
    expect(importOwnContentImageAction).toHaveBeenCalledWith(19, "content");
  });
});
