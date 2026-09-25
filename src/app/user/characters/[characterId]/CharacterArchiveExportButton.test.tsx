import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CharacterArchiveExportButton from "./CharacterArchiveExportButton";

const documents = [
  {
    id: 7,
    characterId: 4,
    fileName: "Dienstakte.pdf",
    kind: "pdf" as const,
    sizeBytes: 1234,
    createdAt: "2026-09-24",
    previewUrl: "/preview",
    downloadUrl: "/download",
  },
  {
    id: 8,
    characterId: 4,
    fileName:
      "Ausführlicher Bericht über die gesamte Forschungsmission der U.S.S. Beispiel.pdf",
    kind: "pdf" as const,
    sizeBytes: 4321,
    createdAt: "2026-09-25",
    previewUrl: "/preview-long",
    downloadUrl: "/download-long",
  },
];

const missions = [
  {
    slug: "erste-mission",
    title: "Erste Mission",
    canExportWholeMission: true,
    logs: [
      {
        id: 9,
        slug: "captains-log",
        title: "Captain's Log",
        logDate: "2026-09-24",
        sessionNr: 2,
        isDraft: false,
      },
    ],
  },
  {
    slug: "entwurf",
    title: "Geheime Mission",
    canExportWholeMission: false,
    logs: [
      {
        id: 10,
        slug: "privater-entwurf",
        title: "Privater Entwurf",
        logDate: null,
        sessionNr: null,
        isDraft: true,
      },
    ],
  },
];

describe("CharacterArchiveExportButton", () => {
  it("wählt Charakter und eigene Logs vor, Dokumente aber nicht", () => {
    render(
      <CharacterArchiveExportButton
        characterId={4}
        characterName="T'Vel"
        documents={documents}
        missions={missions}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Charakter exportieren" }),
    );

    expect(
      screen.getByRole("checkbox", { name: /Personalakte/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Dienstakte.pdf" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Captain's Log/ }),
    ).toBeChecked();
  });

  it("ersetzt Einzel-Logs durch die gewählte Gesamtmission", () => {
    render(
      <CharacterArchiveExportButton
        characterId={4}
        characterName="T'Vel"
        documents={documents}
        missions={missions}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Charakter exportieren" }),
    );

    const wholeMission = screen.getByRole("checkbox", {
      name: /Ganze Mission: Erste Mission/,
    });
    const individualLog = screen.getByRole("checkbox", {
      name: /Captain's Log/,
    });
    fireEvent.click(wholeMission);

    expect(wholeMission).toBeChecked();
    expect(individualLog).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /Ganze Mission: Geheime Mission/ }),
    ).toBeDisabled();
  });

  it("kürzt lange Dokumentnamen nur sichtbar, nicht für die Bedienung", () => {
    const longName = documents[1].fileName;
    render(
      <CharacterArchiveExportButton
        characterId={4}
        characterName="T'Vel"
        documents={documents}
        missions={missions}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Charakter exportieren" }),
    );

    expect(screen.getByRole("checkbox", { name: longName })).toBeVisible();
    expect(screen.queryByText(longName)).not.toBeInTheDocument();
    expect(screen.getByTitle(longName).textContent).toMatch(/…\.pdf$/);
  });
});
