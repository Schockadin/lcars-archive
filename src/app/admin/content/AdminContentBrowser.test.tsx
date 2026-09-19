import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminContentBrowser from "./AdminContentBrowser";
import type { AdminContentItem } from "@/lib/adminContent";

// Die Server-Actions werden hier nicht ausgeführt — sie ziehen die
// Datenschicht nach und haben mit der Filterung nichts zu tun (gleiches
// Vorgehen wie in CreateDialogueForm.test.tsx).
vi.mock("../contentOwnerActions", () => ({
  bulkSetContentOwnerAction: vi.fn(),
}));
vi.mock("@/components/OwnerSelect", () => ({
  default: () => <div data-testid="owner-select" />,
}));
vi.mock("@/components/DeleteContentButton", () => ({
  default: () => <button type="button">Löschen</button>,
}));

function item(
  contentType: AdminContentItem["contentType"],
  id: number,
  title: string,
  ownerId: number | null = null,
): AdminContentItem {
  return {
    contentType,
    id,
    slug: `slug-${id}`,
    title,
    href: `/x/${id}`,
    ownerId,
    ownerName: ownerId === null ? null : `User ${ownerId}`,
    updatedAt: "2401-03-14",
  };
}

const ITEMS: AdminContentItem[] = [
  item("character", 1, "Tuvok", 1),
  item("character", 2, "T'Pol"),
  item("mission", 3, "Tuvoks Rückkehr"),
  item("mission_log", 4, "Logbuch Deneb"),
  item("archive_entry", 5, "Klingonen"),
];

function setup() {
  render(
    <AdminContentBrowser
      items={ITEMS}
      users={[{ id: 1, name: "Ada" }]}
    />,
  );
  return screen.getByLabelText("Inhalte nach Titel durchsuchen");
}

// Die Titel der gerenderten Einträge — LcarsAkteCard setzt sie in
// .mission-akte-title (siehe AkteCard.tsx).
function sichtbareTitel(): string[] {
  return [...document.querySelectorAll(".mission-akte-title")].map(
    (el) => el.textContent ?? "",
  );
}

// Die Beschriftungen der Gruppenkästen — bewusst über die Klasse aus
// DataRowPill.tsx statt über den Text: „Missionslogs" steht auch im
// Kategorie-Auswahlfeld.
function sichtbareGruppen(): string[] {
  return [...document.querySelectorAll(".lcars-data-row-label-text")].map(
    (el) => el.textContent ?? "",
  );
}

describe("AdminContentBrowser — Suchfeld", () => {
  it("zeigt ohne Eingabe alle Inhalte", () => {
    setup();
    expect(new Set(sichtbareTitel())).toEqual(
      new Set(["Tuvok", "T'Pol", "Tuvoks Rückkehr", "Logbuch Deneb", "Klingonen"]),
    );
  });

  it("grenzt auf Titel ein, über alle Inhaltsarten hinweg", () => {
    const feld = setup();
    fireEvent.change(feld, { target: { value: "tuvok" } });

    // Groß-/Kleinschreibung zählt nicht, und der Treffer in der Mission zählt
    // genauso wie der im Charakter.
    expect(new Set(sichtbareTitel())).toEqual(
      new Set(["Tuvok", "Tuvoks Rückkehr"]),
    );
  });

  it("blendet die Arten ohne Treffer aus, solange gesucht wird", () => {
    const feld = setup();
    expect(sichtbareGruppen()).toContain("Missionslogs");

    fireEvent.change(feld, { target: { value: "tuvok" } });
    expect(sichtbareGruppen()).toEqual(["Charaktere", "Missionen"]);

    // Leert man das Feld, ist die Übersicht wieder vollständig.
    fireEvent.change(feld, { target: { value: "" } });
    expect(sichtbareGruppen()).toContain("Missionslogs");
  });

  it("sagt es in einer Zeile, wenn nichts passt", () => {
    const feld = setup();
    fireEvent.change(feld, { target: { value: "gibt es nicht" } });

    expect(
      screen.getByText("Kein Inhalt passt zu Suche und Filtern."),
    ).toBeInTheDocument();
    expect(sichtbareTitel()).toEqual([]);
    // Und zwar wirklich nur diese eine Zeile — keine vier leeren Kästen.
    expect(sichtbareGruppen()).toEqual([]);
  });

  it("zeigt ohne Eingabe auch die leeren Arten — die Übersicht ist eine Bestandsaufnahme", () => {
    render(
      <AdminContentBrowser
        items={[item("character", 1, "Einzelstück")]}
        users={[]}
      />,
    );

    expect(sichtbareGruppen()).toEqual([
      "Charaktere",
      "Missionen",
      "Missionslogs",
      "Datenbank-Einträge",
    ]);
  });

  it("wirkt zusammen mit dem Kategorie-Filter", () => {
    const feld = setup();
    fireEvent.change(feld, { target: { value: "tuvok" } });
    fireEvent.change(screen.getByLabelText("Nach Kategorie filtern"), {
      target: { value: "mission" },
    });

    expect(sichtbareTitel()).toEqual(["Tuvoks Rückkehr"]);
  });

  it("wählt mit „Alle auswählen“ nur die gefundenen Inhalte aus", () => {
    const feld = setup();
    fireEvent.change(feld, { target: { value: "tuvok" } });
    fireEvent.click(screen.getByRole("button", { name: "Alle auswählen" }));

    // Entscheidend: Die Mass-Edit-Aktion bezieht sich auf die SICHTBAREN
    // zwei, nicht auf alle fünf.
    expect(
      screen.getByRole("button", { name: /Owner setzen \(2\)/ }),
    ).toBeInTheDocument();
  });

  it("filtert weiterhin nach Owner", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Nach Owner filtern"), {
      target: { value: "1" },
    });

    expect(sichtbareTitel()).toEqual(["Tuvok"]);
  });
});
