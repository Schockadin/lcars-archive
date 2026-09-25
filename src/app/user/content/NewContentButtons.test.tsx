import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NewContentButtons from "./NewContentButtons";
import type { NewContentData } from "./newContentData";

// Die Formulare ziehen ihre Server-Actions und damit die Datenschicht
// nach — geprüft wird hier, WELCHES Formular ein Knopf öffnet, nicht dessen
// Inhalt (gleiches Muster wie MissionSynopsis.test.tsx).
vi.mock("@/app/user/mission-logs/new/NewMissionLogForm", () => ({
  default: () => <div data-testid="form-missionLog" />,
}));
vi.mock("@/app/user/dialogues/new/CreateDialogueForm", () => ({
  default: () => <div data-testid="form-dialogue" />,
}));
vi.mock("@/app/user/archive/new/NewArchiveEntryForm", () => ({
  default: ({ initialCategory }: { initialCategory?: string }) => (
    <div data-testid="form-archive" data-category={initialCategory} />
  ),
}));
vi.mock("@/app/user/missions/new/NewMissionForm", () => ({
  default: () => <div data-testid="form-mission" />,
}));
vi.mock("@/components/timeline/ManualEventForm", () => ({
  default: ({
    defaultDate,
    characters,
    triggerVariant,
  }: {
    defaultDate: string | null;
    characters: { id: number; name: string }[];
    triggerVariant?: string;
  }) => (
    <button
      type="button"
      data-testid="form-event"
      data-date={defaultDate ?? ""}
      data-characters={characters.length}
      data-variant={triggerVariant}
    >
      Neues Event
    </button>
  ),
}));

function data(overrides: Partial<NewContentData> = {}): NewContentData {
  return {
    userId: 1,
    missionLog: {
      ownCharacters: [{ id: 1, slug: "tuvok", name: "Tuvok" }],
      missions: [{ slug: "deneb", title: "Deneb" }],
      defaultSessionNr: 3,
      defaultLogDate: "2400-01-01",
    },
    dialogue: {
      ownCharacters: [{ id: 1, slug: "tuvok", name: "Tuvok" }],
      partnerCharacters: [],
      npcs: [],
      canPlayNpcs: false,
      gms: [],
      locations: [],
      defaultLogDate: "2400-01-01",
    },
    mission: { defaultStartedAt: "2400-01-01", characters: [] },
    event: {
      defaultDate: "2400-01-01",
      characters: [{ id: 2, name: "Seven" }],
    },
    ...overrides,
  };
}

describe("NewContentButtons", () => {
  it("öffnet jeden Inhaltstyp in einem Fenster statt auf einer eigenen Seite", async () => {
    render(<NewContentButtons data={data()} />);

    // Vorher waren es Links auf /user/mission-logs/new & Co. — die Seiten
    // gibt es weiterhin, hier führt der Weg aber nicht mehr weg von der Liste.
    expect(screen.queryByRole("link")).toBeNull();

    expect(screen.queryByTestId("form-missionLog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Neuer Missionslog" }));
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Neuen Missionslog anlegen",
    );
    expect(await screen.findByTestId("form-missionLog")).toBeInTheDocument();
  });

  it("lädt Gesprächs- und Missionsformulare erst im gewählten Modal", async () => {
    const { unmount } = render(<NewContentButtons data={data()} />);
    expect(screen.queryByTestId("form-dialogue")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Neues Gespräch" }));
    expect(await screen.findByTestId("form-dialogue")).toBeInTheDocument();
    unmount();

    render(<NewContentButtons data={data()} />);
    expect(screen.queryByTestId("form-mission")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Neue Mission" }));
    expect(await screen.findByTestId("form-mission")).toBeInTheDocument();
  });

  it("legt einen NPC im Datenbank-Formular mit vorgewählter Kategorie an", async () => {
    render(<NewContentButtons data={data()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neuer NPC" }));

    expect(await screen.findByTestId("form-archive")).toHaveAttribute(
      "data-category",
      "npc",
    );
  });

  it("reicht Datum und Figuren an das gemeinsame Event-Formular durch", () => {
    render(<NewContentButtons data={data()} />);

    expect(screen.getByRole("button", { name: "Neues Event" })).toHaveAttribute(
      "data-variant",
      "pill",
    );
    expect(screen.getByTestId("form-event")).toHaveAttribute(
      "data-date",
      "2400-01-01",
    );
    expect(screen.getByTestId("form-event")).toHaveAttribute(
      "data-characters",
      "1",
    );
  });

  it("schließt das Fenster wieder", () => {
    render(<NewContentButtons data={data()} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Neuer Datenbank-Eintrag" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("zeigt nur die Knöpfe, für die es auch ein Formular gibt", () => {
    // Ohne eigenen veröffentlichten Charakter kein Log, ohne Spielleitung
    // keine Mission — die Seite reicht dann gar keine Daten dafür durch.
    render(
      <NewContentButtons
        data={data({
          missionLog: null,
          dialogue: null,
          mission: null,
          event: null,
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Neuer Missionslog" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Neues Gespräch" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Neue Mission" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Neues Event" })).toBeNull();
    // Datenbank-Einträge darf jeder eingeloggte User anlegen.
    expect(
      screen.getByRole("button", { name: "Neuer Datenbank-Eintrag" }),
    ).toBeInTheDocument();
  });

  // Das Dashboard reicht hier durch, welche Knöpfe dort eingeschaltet sind
  // (siehe src/lib/dashboardSections.ts) — „Meine Inhalte" reicht nichts
  // durch und zeigt weiterhin alle.
  it("zeigt mit `show` nur die verlangten Knöpfe", () => {
    render(<NewContentButtons data={data()} show={["archiveEntry", "npc"]} />);

    expect(
      screen.getByRole("button", { name: "Neuer Datenbank-Eintrag" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Neuer NPC" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Neuer Missionslog" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Neues Gespräch" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Neue Mission" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Neues Event" })).toBeNull();
  });

  // `show` erlaubt, es ersetzt die Prüfung nicht: Ein Knopf ohne Formular
  // bleibt weg, auch wenn er ausdrücklich verlangt wurde.
  it("zeigt auch mit `show` keinen Knopf ohne Formular", () => {
    render(
      <NewContentButtons
        data={data({ missionLog: null })}
        show={["missionLog", "npc"]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Neuer Missionslog" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Neuer NPC" }),
    ).toBeInTheDocument();
  });

  // Der Import führt nach /user/import — was dort angeboten wird, hängt an
  // der jeweiligen Berechtigung (importAccess.ts), der Knopf selbst aber
  // nicht: Ob er Platz bekommt, entscheidet allein der Aufrufer (auf der
  // Startseite die Sektion im Profil).
  it("zeigt den Import nur, wenn der Aufrufer ihn erlaubt", () => {
    const { unmount } = render(<NewContentButtons data={data()} />);
    expect(screen.queryByRole("link", { name: "Import" })).toBeNull();
    unmount();

    render(<NewContentButtons data={data()} canImport />);
    expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute(
      "href",
      "/user/import",
    );
  });

  // Anders als die übrigen kein Fenster: Der Ablauf blättert durch mehrere
  // Dateien und bestätigt jede einzeln — dafür ist ein Fenster zu klein.
  it("führt beim Import auf die Seite statt in ein Fenster", () => {
    render(<NewContentButtons data={data()} canImport />);

    expect(screen.queryByRole("button", { name: "Import" })).toBeNull();
  });

  // Breite und Umbruch der Leiste stehen in .lcars-btn-row (controls.css),
  // nicht an den Knöpfen. Trüge ein Knopf wieder eine eigene Breite, schlüge
  // sie die drei Stufen dort — und niemand sähe es, weil jsdom kein CSS
  // rechnet. Der Test hält deshalb die Aufteilung fest, nicht das Ergebnis.
  it("überlässt der Leiste die Breite", () => {
    const { container } = render(<NewContentButtons data={data()} canImport />);

    expect(container.querySelector(".lcars-btn-row")).not.toBeNull();
    for (const el of container.querySelectorAll<HTMLElement>(
      ".lcars-btn-row > *",
    )) {
      expect(el.className).not.toMatch(/\bw-\[|\bw-full\b|max-sm:w-/);
    }
  });

  it("bietet keinen Knopf für einen neuen Charakter", () => {
    // Charaktere entstehen im Assistenten unter /user/characters — er führt
    // über mehrere Schritte und gehört nicht in ein Fenster.
    render(<NewContentButtons data={data()} />);

    expect(screen.queryByText(/Charakter/)).toBeNull();
  });
});
