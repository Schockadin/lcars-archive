import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardSettingsForm from "./DashboardSettingsForm";
import {
  DASHBOARD_SECTIONS,
  EMPTY_DASHBOARD_PREFS,
  type DashboardSectionId,
} from "@/lib/dashboardSections";

// Die Action zieht die Datenschicht nach — geprüft wird hier das Formular:
// welche Häkchen stehen, was es mitschickt.
const updateDashboardSettingsAction = vi.fn(async () => ({ success: true }));
vi.mock("./dashboardSettingsActions", () => ({
  updateDashboardSettingsAction: (...args: unknown[]) =>
    (
      updateDashboardSettingsAction as unknown as (
        ...a: unknown[]
      ) => Promise<{ success: boolean }>
    )(...args),
}));

// Über die id, nicht über die Beschriftung: Ein <label> umfasst hier auch
// die Erklärzeile darunter, und getByLabelText liest die mit. „Entwürfe"
// stand damit in zwei Kästchen — einmal als Sektion, einmal im Hinweis zu
// den To Dos („offene Entwürfe"). Die id ist eindeutig und ändert sich nicht
// mit dem Wortlaut.
function sektion(id: DashboardSectionId): HTMLInputElement {
  return document.getElementById(`dashboard-${id}`) as HTMLInputElement;
}

function charakter(id: number): HTMLInputElement {
  return document.getElementById(
    `dashboard-character-${id}`,
  ) as HTMLInputElement;
}

function versteckteWerte(name: string): string[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`),
  ).map((input) => input.value);
}

describe("DashboardSettingsForm", () => {
  beforeEach(() => {
    updateDashboardSettingsAction.mockClear();
  });

  it("steht ohne gespeicherte Wahl auf den Vorgaben", () => {
    render(
      <DashboardSettingsForm prefs={EMPTY_DASHBOARD_PREFS} characters={[]} />,
    );

    for (const section of DASHBOARD_SECTIONS) {
      expect(sektion(section.id).checked).toBe(section.default);
    }
  });

  it("zeigt die gespeicherte Wahl statt der Vorgabe", () => {
    render(
      <DashboardSettingsForm
        prefs={{ sections: { news: false, versionen: true }, hiddenCharacters: [] }}
        characters={[]}
      />,
    );

    expect(sektion("news").checked).toBe(false);
    expect(sektion("versionen").checked).toBe(true);
    // Unberührte Sektionen bleiben auf ihrer Vorgabe.
    expect(sektion("spielabende").checked).toBe(true);
  });

  // Ohne dieses versteckte Feld wäre ein entferntes Häkchen von „das
  // Formular kennt die Sektion nicht" nicht zu unterscheiden — die Action
  // könnte dann nichts abwählen (siehe dashboardSettingsActions.ts).
  it("schickt zu jeder Sektion mit, dass sie zur Wahl stand", () => {
    render(
      <DashboardSettingsForm prefs={EMPTY_DASHBOARD_PREFS} characters={[]} />,
    );

    expect(versteckteWerte("knownSections")).toEqual(
      DASHBOARD_SECTIONS.map((s) => s.id),
    );
  });

  it("führt die eigenen Charaktere einzeln und angehakt", () => {
    render(
      <DashboardSettingsForm
        prefs={EMPTY_DASHBOARD_PREFS}
        characters={[
          { id: 4, name: "T'Vel" },
          { id: 9, name: "Rina Dax" },
        ]}
      />,
    );

    expect(charakter(4).checked).toBe(true);
    expect(charakter(9).checked).toBe(true);
    expect(versteckteWerte("knownCharacters")).toEqual(["4", "9"]);
  });

  it("lässt einen abgewählten Charakter abgewählt", () => {
    render(
      <DashboardSettingsForm
        prefs={{ sections: {}, hiddenCharacters: [9] }}
        characters={[
          { id: 4, name: "T'Vel" },
          { id: 9, name: "Rina Dax" },
        ]}
      />,
    );

    expect(charakter(4).checked).toBe(true);
    expect(charakter(9).checked).toBe(false);
  });

  it("lässt die Charakter-Liste weg, solange es keine gibt", () => {
    render(
      <DashboardSettingsForm prefs={EMPTY_DASHBOARD_PREFS} characters={[]} />,
    );

    expect(screen.queryByText("Diese Charaktere zeigen")).toBeNull();
    expect(versteckteWerte("knownCharacters")).toEqual([]);
    // Die Sektion selbst bleibt trotzdem wählbar — sie soll beim ersten
    // Charakter sofort greifen.
    expect(sektion("charaktere").checked).toBe(true);
  });
});
