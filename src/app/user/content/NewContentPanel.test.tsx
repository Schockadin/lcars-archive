import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NewContentPanel from "./NewContentPanel";
import type { NewContentData } from "./newContentData";

// Die vier Formulare ziehen ihre Server-Actions und damit die Datenschicht
// nach — hier geht es um den Abschnitt drumherum, nicht um ihren Inhalt
// (gleiches Muster wie NewContentButtons.test.tsx).
vi.mock("@/app/user/mission-logs/new/NewMissionLogForm", () => ({
  default: () => null,
}));
vi.mock("@/app/user/dialogues/new/CreateDialogueForm", () => ({
  default: () => null,
}));
vi.mock("@/app/user/archive/new/NewArchiveEntryForm", () => ({
  default: () => null,
}));
vi.mock("@/app/user/missions/new/NewMissionForm", () => ({
  default: () => null,
}));

function data(over: Partial<NewContentData> = {}): NewContentData {
  return {
    userId: 1,
    missionLog: {
      ownCharacters: [],
      missions: [],
      defaultSessionNr: 1,
      defaultLogDate: null,
    },
    dialogue: {
      ownCharacters: [],
      partnerCharacters: [],
      npcs: [],
      canPlayNpcs: false,
      gms: [],
      locations: [],
      defaultLogDate: null,
    },
    mission: { defaultStartedAt: null, characters: [] },
    ...over,
  };
}

// Die Knöpfe, die ein Formular-Fenster öffnen. Bewusst über das Element und
// nicht über die Rolle: Das <summary> der Klappe trägt zwar eine
// Knopf-Semantik, ist aber kein Knopf der Leiste.
function knopfZahl(): number {
  return document.querySelectorAll("button").length;
}

describe("NewContentPanel", () => {
  // Der Punkt des ganzen Umbaus: Kopfzeile und Leiste bilden ihre Menge aus
  // derselben Funktion. Weicht die Zahl von den Knöpfen ab, ist genau das
  // Auseinanderlaufen zurück, das die gemeinsame Komponente verhindern soll.
  it("nennt in der Kopfzeile so viele Knöpfe, wie darunter stehen", () => {
    render(<NewContentPanel data={data()} storageId="content:anlegen" />);

    expect(knopfZahl()).toBe(5);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("zählt den Import mit", () => {
    render(<NewContentPanel data={data()} canImport />);

    expect(
      screen.getByRole("link", { name: "Inhalte importieren" }),
    ).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("zählt nur, was die Auswahl der Seite hergibt", () => {
    render(<NewContentPanel data={data()} show={["npc", "archiveEntry"]} />);

    expect(knopfZahl()).toBe(2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // Ohne einen einzigen Knopf stünde sonst eine Überschrift über einer leeren
  // Zeile — möglich etwa für ein Konto, das auf der Startseite alle
  // Anlege-Knöpfe abgewählt hat.
  it("verschwindet ganz, wenn kein Knopf übrig bleibt", () => {
    const { container } = render(
      <NewContentPanel data={data()} show={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("steht per Vorgabe offen und lässt sich das abgewöhnen", () => {
    const { unmount } = render(<NewContentPanel data={data()} />);
    expect(document.querySelector("details")?.open).toBe(true);
    unmount();

    render(<NewContentPanel data={data()} defaultOpen={false} />);
    expect(document.querySelector("details")?.open).toBe(false);
  });
});
