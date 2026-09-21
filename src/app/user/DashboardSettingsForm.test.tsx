import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardSettingsForm from "./DashboardSettingsForm";
import {
  DASHBOARD_SECTIONS,
  EMPTY_DASHBOARD_PREFS,
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

function checkbox(label: string): HTMLInputElement {
  return screen.getByLabelText(label, { exact: false }) as HTMLInputElement;
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
      expect(checkbox(section.label).checked).toBe(section.default);
    }
  });

  it("zeigt die gespeicherte Wahl statt der Vorgabe", () => {
    render(
      <DashboardSettingsForm
        prefs={{ sections: { news: false, versionen: true }, hiddenCharacters: [] }}
        characters={[]}
      />,
    );

    expect(checkbox("News").checked).toBe(false);
    expect(checkbox("Versionen").checked).toBe(true);
    // Unberührte Sektionen bleiben auf ihrer Vorgabe.
    expect(checkbox("Nächste Spielabende").checked).toBe(true);
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

    expect(checkbox("T'Vel").checked).toBe(true);
    expect(checkbox("Rina Dax").checked).toBe(true);
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

    expect(checkbox("T'Vel").checked).toBe(true);
    expect(checkbox("Rina Dax").checked).toBe(false);
  });

  it("lässt die Charakter-Liste weg, solange es keine gibt", () => {
    render(
      <DashboardSettingsForm prefs={EMPTY_DASHBOARD_PREFS} characters={[]} />,
    );

    expect(screen.queryByText("Diese Charaktere zeigen")).toBeNull();
    expect(versteckteWerte("knownCharacters")).toEqual([]);
    // Die Sektion selbst bleibt trotzdem wählbar — sie soll beim ersten
    // Charakter sofort greifen.
    expect(checkbox("Meine Charaktere").checked).toBe(true);
  });
});
