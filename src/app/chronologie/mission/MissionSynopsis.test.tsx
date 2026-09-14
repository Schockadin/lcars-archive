import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MissionSynopsis from "./MissionSynopsis";
import type { MissionDetail } from "@/types/missions";
import type { Viewer } from "@/lib/visibility";

// Der Lesemodus-Umschalter im Kopf zieht useNeo() und damit den NeoProvider
// nach, den es im Test nicht gibt. Die Funktionen sind stabil, damit der
// Effekt in ReadingModeToggle nicht bei jedem Render neu läuft.
const neo = vi.hoisted(() => ({
  readingMode: false,
  toggleReadingMode: () => {},
  resetReadingModeOnUnmount: () => {},
  preserveReadingModeOnce: () => {},
}));
vi.mock("@/hooks/useNeo", () => ({ useNeo: () => neo }));
// Das Aktionen-Panel zieht Router und Bildergalerie nach; geprüft wird hier
// der Kopf, nicht das Panel. Der Platzhalter zeigt nur, WO es steht.
vi.mock("@/components/ContentActionsPanel", () => ({
  default: () => <div data-testid="actions-panel" />,
}));

function mission(overrides: Partial<MissionDetail> = {}): MissionDetail {
  return {
    id: 7,
    slug: "zwischenfall-deneb-iv",
    title: "Zwischenfall auf Deneb IV",
    status: "completed",
    started_at: "2400-09-15",
    ended_at: "2400-10-02",
    metadata: { tags: [], body: "<p>Die Synopsis.</p>", teaser: null },
    updated_at: "2400-10-03",
    ownerUserId: 1,
    isDraft: false,
    sourceMarkdown: "Die Synopsis.",
    participants: [
      { slug: "t-lara", name: "T'Lara" },
      { slug: "marcus-hale", name: "Marcus Hale" },
    ],
    ...overrides,
  };
}

function viewer(permissions: Viewer["permissions"] = []): Viewer {
  return { userId: 1, role: "player", permissions };
}

describe("MissionSynopsis", () => {
  it("zeigt den Titel als h1 im gemeinsamen Kopf", () => {
    render(<MissionSynopsis mission={mission()} viewer={null} owners={[]} />);

    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent("Zwischenfall auf Deneb IV");
    expect(title).toHaveClass("char-file-name");
  });

  it("führt mit dem Rücklink zurück auf die Missionsliste", () => {
    // Der Link saß bis zum Redesign im Kopf der Log-Schiene — ohne ihn führt
    // von der Missionsseite kein Weg zurück.
    render(<MissionSynopsis mission={mission()} viewer={null} owners={[]} />);

    const back = screen.getByRole("link", { name: "‹ Missionen" });
    expect(back).toHaveAttribute("href", "/chronologie/mission");
    expect(back).toHaveClass("lcars-back-link");
  });

  it("nennt den Status der Mission im Klartext", () => {
    // Der Status war vorher nur eine Farbe — das Label aus STATUS_CONFIG
    // wurde auf keiner Seite gerendert.
    const { container } = render(
      <MissionSynopsis mission={mission()} viewer={null} owners={[]} />,
    );

    expect(screen.getByText("Status")).toHaveClass("archive-dialogue-label");
    expect(screen.getByText("Abgeschlossen")).toBeInTheDocument();
    expect(container.querySelector(".archive-chip")).toBeTruthy();
  });

  it("zeigt den Zeitraum", () => {
    render(<MissionSynopsis mission={mission()} viewer={null} owners={[]} />);

    expect(screen.getByText("Zeitraum")).toBeInTheDocument();
    expect(screen.getByText(/15\.09\.2400/)).toBeInTheDocument();
  });

  it("verlinkt jeden Teilnehmer als Chip auf seine Charakterseite", () => {
    render(<MissionSynopsis mission={mission()} viewer={null} owners={[]} />);

    const lara = screen.getByRole("link", { name: "T'Lara" });
    expect(lara).toHaveAttribute("href", "/characters/t-lara");
    expect(lara).toHaveClass("archive-chip");
    expect(screen.getByRole("link", { name: "Marcus Hale" })).toHaveAttribute(
      "href",
      "/characters/marcus-hale",
    );
  });

  it("lässt die Teilnehmerzeile weg, wenn niemand eingetragen ist", () => {
    render(
      <MissionSynopsis
        mission={mission({ participants: [] })}
        viewer={null}
        owners={[]}
      />,
    );

    expect(screen.queryByText("Teilnehmer")).toBeNull();
  });

  it("legt die Zusammenfassung in ein aufklappbares Feld — offen", () => {
    // Dasselbe Feld wie auf den Missions-Karten der Chronologie (ChronoPanel).
    const { container } = render(
      <MissionSynopsis mission={mission()} viewer={null} owners={[]} />,
    );

    const panel = container.querySelector("details.timeline-panel");
    expect(panel).toBeTruthy();
    expect(panel).toHaveAttribute("open");
    // Eigene Klasse: auf der Seite muss der Schalter deutlicher zu sehen
    // sein als der Nebentext auf einer Karte (siehe mission-detail.css).
    expect(panel).toHaveClass("mission-synopsis-panel");
    expect(panel?.querySelector(".timeline-panel-head")).toHaveTextContent(
      "Zusammenfassung",
    );
    expect(panel?.querySelector(".mission-body")).toBeTruthy();
  });

  it("zeigt einen Hinweis, wenn keine Zusammenfassung vorliegt", () => {
    const { container } = render(
      <MissionSynopsis
        mission={mission({ metadata: { tags: [], body: null, teaser: null } })}
        viewer={null}
        owners={[]}
      />,
    );

    expect(screen.getByText("Keine Zusammenfassung vorhanden")).toHaveClass(
      "lcars-empty-state",
    );
    expect(container.querySelector(".mission-body")).toBeNull();
  });

  it("zeigt die Zusammenfassung auch der Spielleitung nur zum Lesen", () => {
    // Bis v1.34 klappte hier für missions.manage ein Inline-Editor auf, der
    // nur den Fließtext kannte. Bearbeitet wird jetzt im vollen Editor, in
    // den der Stift des Aktionen-Panels springt.
    const { container } = render(
      <MissionSynopsis
        mission={mission()}
        viewer={viewer(["missions.manage"])}
        owners={[]}
      />,
    );

    expect(container.querySelector("details.timeline-panel")).toBeTruthy();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("hält das Aktionen-Panel im Artikel, unterhalb des Textes", () => {
    // Bewusst nicht im Footer-Stack der Seite: es gehört zum Inhalt dieser
    // Spalte, nicht zum Seitenfuß.
    const { container } = render(
      <MissionSynopsis mission={mission()} viewer={viewer()} owners={[]} />,
    );

    const article = container.querySelector("article.mission-detail-article");
    const panel = screen.getByTestId("actions-panel");
    expect(article).toContainElement(panel);
    expect(article?.lastElementChild).toBe(panel);
  });
});
