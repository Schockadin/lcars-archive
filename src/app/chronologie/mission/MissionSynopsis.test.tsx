import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MissionSynopsis from "./MissionSynopsis";
import type { MissionDetail } from "@/types/missions";
import type { Viewer } from "@/lib/visibility";

// Die Server-Actions werden im Test nicht ausgeführt — sie ziehen die
// Datenschicht nach und haben mit der Darstellung nichts zu tun (gleiches
// Muster wie CreateDialogueForm.test.tsx).
vi.mock("@/app/actions/missions", () => ({
  updateMissionSynopsisAction: vi.fn(),
}));
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
vi.mock("@/app/_shared/MarkdownEditor", () => ({
  default: ({ id }: { id: string }) => <textarea id={id} />,
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

  it("nennt den Status der Mission im Klartext", () => {
    // Der Status war vorher nur eine Farbe — das Label aus STATUS_CONFIG
    // wurde auf keiner Seite gerendert.
    const { container } = render(
      <MissionSynopsis mission={mission()} viewer={null} owners={[]} />
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
      />
    );

    expect(screen.queryByText("Teilnehmer")).toBeNull();
  });

  it("zeigt einen Hinweis, wenn keine Zusammenfassung vorliegt", () => {
    const { container } = render(
      <MissionSynopsis
        mission={mission({ metadata: { tags: [], body: null, teaser: null } })}
        viewer={null}
        owners={[]}
      />
    );

    expect(
      screen.getByText("Keine Zusammenfassung vorhanden"),
    ).toHaveClass("lcars-empty-state");
    expect(container.querySelector(".mission-body")).toBeNull();
  });

  it("hält das Aktionen-Panel im Artikel, unterhalb des Textes", () => {
    // Bewusst nicht im Footer-Stack der Seite: der Stift im Panel schaltet
    // den editMode dieser Client-Komponente (gleiches Muster wie
    // CharacterHero). Nur die Log-Seite ohne Inline-Editor legt es nach außen.
    const { container } = render(
      <MissionSynopsis mission={mission()} viewer={viewer()} owners={[]} />
    );

    const article = container.querySelector("article.mission-detail-article");
    const panel = screen.getByTestId("actions-panel");
    expect(article).toContainElement(panel);
    expect(article?.lastElementChild).toBe(panel);
  });
});
