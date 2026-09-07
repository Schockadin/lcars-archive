import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TimelineView from "./TimelineView";
import type { TimelineEvent } from "@/lib/timelineTypes";

// Die vorgewählte Ereignisart kommt aus der Route (/chronologie/[kategorie]).
// Sie kann eine Art benennen, zu der es (noch) kein Ereignis gibt — die
// Adresse ist teilbar und überlebt das Löschen des letzten Konflikts.

function event(partial: Partial<TimelineEvent>): TimelineEvent {
  return {
    id: "e1",
    date: "2401-03-05",
    title: "Erste Mission",
    detail: null,
    category: "mission",
    origin: "metadata",
    sourceType: "mission",
    sourceTitle: "Erste Mission",
    href: "/chronologie/mission/erste-mission",
    people: [],
    phase: "start",
    ...partial,
  };
}

const EVENTS = [event({}), event({ id: "e2", category: "log", phase: undefined })];

function artFilter(): HTMLSelectElement {
  return screen.getByLabelText("Nach Ereignisart filtern") as HTMLSelectElement;
}

describe("TimelineView – vorgewählte Ereignisart", () => {
  it("hält eine Art wählbar, zu der es kein Ereignis gibt", () => {
    // Ohne diese Regel zeigte das Feld „Alle Arten", während der Filter
    // greift und die Liste leer bleibt — und ließ sich nicht zurücknehmen:
    // ein Klick auf den ohnehin angezeigten Eintrag löst kein change aus.
    render(<TimelineView events={EVENTS} initialCategory="political" />);

    expect(artFilter().value).toBe("political");
    expect(
      screen.getByText("Keine Ereignisse für diese Auswahl."),
    ).toBeInTheDocument();

    // Und der Weg zurück steht offen.
    fireEvent.change(artFilter(), { target: { value: "" } });
    expect(screen.queryByText("Keine Ereignisse für diese Auswahl.")).toBeNull();
  });

  it("zeigt das Auswahlfeld auch, wenn nur eine Art übrig ist", () => {
    // Eine Auswahl mit einem Eintrag ist sonst nur Beiwerk und wird
    // ausgeblendet — läuft aber ein Filter, muss er erreichbar bleiben.
    render(
      <TimelineView events={[event({})]} initialCategory="mission" />,
    );
    expect(artFilter()).toBeInTheDocument();
    expect(artFilter().value).toBe("mission");
  });

  it("stellt ohne vorgewählte Art auf den Umfang Missionen", () => {
    // Vorgabe der Chronologie: nur die Missionsstarts. Eine Art aus der
    // Route hebt das auf „Alle Ereignisse" an, weil sie sonst garantiert
    // ins Leere liefe.
    render(<TimelineView events={EVENTS} />);
    const umfang = screen.getByLabelText(
      "Umfang der Chronologie",
    ) as HTMLSelectElement;
    expect(umfang.value).toBe("missions");

    render(<TimelineView events={EVENTS} initialCategory="log" />);
    const umfaenge = screen.getAllByLabelText(
      "Umfang der Chronologie",
    ) as HTMLSelectElement[];
    expect(umfaenge[umfaenge.length - 1].value).toBe("all");
  });
});
