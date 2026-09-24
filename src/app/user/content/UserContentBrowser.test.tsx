import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UserContentBrowser from "./UserContentBrowser";
import type { UserContentLog } from "@/lib/characters";
import type { UserContentArchiveEntry } from "@/lib/archive";
import type { DialogueSummary } from "@/lib/dialoguesCore";
import type { MissionPreview } from "@/types/missions";

// Die beiden Aktions-Bausteine sprechen Server-Actions an (und damit die
// Datenschicht) — geprüft wird hier der Aufbau der Liste, nicht die Aktion.
vi.mock("./ContentStateSelect", () => ({
  default: ({ isDraft }: { isDraft: boolean }) => (
    <div data-testid="state-select" data-draft={String(isDraft)} />
  ),
}));
vi.mock("./DeleteOwnContentButton", () => ({
  default: () => <button type="button">Löschen</button>,
}));
vi.mock("@/components/ContentLinkToolButton", () => ({
  default: ({ contentType, slug }: { contentType: string; slug: string }) => (
    <div data-testid="link-tool" data-type={contentType} data-slug={slug} />
  ),
}));
vi.mock("@/components/timeline/ManualEventForm", () => ({
  default: ({ event }: { event?: { title: string } }) => (
    <button type="button">Event bearbeiten: {event?.title}</button>
  ),
}));
vi.mock("./DeleteManualEventButton", () => ({
  default: () => <button type="button">Event löschen</button>,
}));

const log: UserContentLog = {
  id: 1,
  slug: "erster-tag",
  title: "Erster Tag",
  session_nr: 3,
  log_date: "2400-05-01",
  mission_slug: "deneb",
  mission_title: "Deneb",
  character_slug: "tuvok",
  character_name: "Tuvok",
  is_draft: false,
};

const draftLog: UserContentLog = {
  ...log,
  id: 2,
  slug: "halbfertig",
  title: "Halbfertig",
  is_draft: true,
};

const entry: UserContentArchiveEntry = {
  id: 10,
  slug: "deep-space-12",
  title: "Deep Space 12",
  category: "location",
  isDraft: false,
};

const dialogue: DialogueSummary = {
  id: 20,
  slug: "kantine",
  title: "Abend in der Kantine",
  partnerName: "Kira",
  updatedAt: "2400-05-02",
  logDate: null,
  open: true,
  characterSlug: "tuvok",
  characterName: "Tuvok",
  isDraft: false,
  ownerUserId: 1,
};

const mission: MissionPreview = {
  id: 30,
  slug: "deneb",
  title: "Zwischenfall auf Deneb",
  status: "completed",
  started_at: "2400-04-01",
  ended_at: null,
  metadata: { tags: [], body: null, teaser: null },
  log_count: 1,
  authors: [],
  isDraft: false,
};

function renderBrowser(
  props: Partial<Parameters<typeof UserContentBrowser>[0]> = {},
) {
  return render(
    <UserContentBrowser
      characters={[{ slug: "tuvok", name: "Tuvok" }]}
      logs={[log, draftLog]}
      dialogues={[dialogue]}
      archiveEntries={[entry]}
      missions={[mission]}
      canManageMissions
      canLinkAnyContent
      ownUserId={1}
      {...props}
    />,
  );
}

describe("UserContentBrowser", () => {
  it("gruppiert in der Vorgabe nach Kategorie — mit h2 je Abschnitt", () => {
    renderBrowser();

    // Dieselbe Bauform wie Chronologie und Datenbank: Überschrift, darunter
    // die Schiene mit den Karten. Vorher war jede Kategorie ein Akkordeon.
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Missionslogs",
      "Gespräche",
      "Datenbank-Einträge",
      "Missionen",
    ]);
  });

  it("hängt jede Karte an die Schiene der Chronologie", () => {
    const { container } = renderBrowser();

    expect(container.querySelectorAll(".timeline-event").length).toBe(5);
    expect(container.querySelector(".timeline-rail")).toBeTruthy();
    expect(container.querySelector(".lcars-data-row")).toBeNull();
  });

  it("führt eigene Events mit Bearbeiten-Aktion als Inhaltsart", () => {
    renderBrowser({
      logs: [],
      dialogues: [],
      archiveEntries: [],
      missions: [],
      manualEvents: [
        {
          id: 41,
          date: "2400-05-03",
          title: "Vertrag von Algeron",
          teaser: "Eine neue Grenze.",
          detail: "Der vollständige Text.",
          category: "political",
          characterIds: [1],
          characterNames: ["Tuvok"],
        },
      ],
      eventCharacters: [{ id: 1, name: "Tuvok" }],
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Events",
    );
    expect(screen.getByText("Vertrag von Algeron")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Event bearbeiten: Vertrag von Algeron",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Event löschen" }),
    ).toBeInTheDocument();
  });

  it("zeigt Entwürfe in ihrer Kategorie, als Entwurf gekennzeichnet", () => {
    renderBrowser();

    // Früher lagen sie in einer eigenen „Entwürfe"-Klappe über allem.
    expect(screen.getByText("Missionslog · Entwurf")).toBeInTheDocument();
    expect(screen.getByText("Halbfertig")).toBeInTheDocument();
  });

  it("filtert auf Wunsch ausschließlich Entwürfe", () => {
    renderBrowser();

    fireEvent.change(screen.getByLabelText("Nach Kategorie filtern"), {
      target: { value: "drafts" },
    });

    expect(screen.getByText("Halbfertig")).toBeInTheDocument();
    expect(screen.queryByText("Erster Tag")).toBeNull();
    expect(screen.queryByText("Deep Space 12")).toBeNull();
  });

  it("sortiert alphabetisch über alle Kategorien hinweg — dann ohne Abschnitte", () => {
    renderBrowser();

    fireEvent.click(screen.getByRole("button", { name: /Alphabetisch/ }));

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    const titles = screen
      .getAllByRole("link")
      .map((a) => a.textContent)
      .filter((t): t is string => !!t);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, "de")),
    );
  });

  it("hält den Charakter-Filter auf Berichte und Gespräche beschränkt", () => {
    // Datenbank-Einträge und Missionen hängen am Konto, nicht an einer Figur —
    // sie dürfen durch den Figuren-Filter nicht verschwinden.
    renderBrowser({
      logs: [{ ...log, character_slug: "kira", character_name: "Kira" }],
    });

    fireEvent.change(screen.getByLabelText("Nach Charakter filtern"), {
      target: { value: "tuvok" },
    });

    expect(screen.queryByText("Erster Tag")).toBeNull();
    expect(screen.getByText("Deep Space 12")).toBeInTheDocument();
    expect(screen.getByText("Abend in der Kantine")).toBeInTheDocument();
  });

  it("gibt dem Gesprächspartner keine Aktionen an die Hand", () => {
    renderBrowser({
      dialogues: [{ ...dialogue, ownerUserId: 999 }],
      logs: [],
      archiveEntries: [],
      missions: [],
    });

    expect(screen.getByText("Abend in der Kantine")).toBeInTheDocument();
    expect(screen.queryByTestId("state-select")).toBeNull();
  });

  it("gibt jedem eigenen Inhalt das Verlinkungs-Werkzeug — außer Gesprächen", () => {
    renderBrowser();

    const tools = screen.getAllByTestId("link-tool");
    expect(tools.map((el) => [el.dataset.type, el.dataset.slug])).toEqual([
      // Beide Logbücher (auch der Entwurf), der Datenbank-Eintrag und die
      // Mission — das Gespräch nicht: dessen Text liegt in den Nachrichten,
      // nicht in einem Markdown-Feld (siehe getArchiveEntrySourceBySlug).
      ["missionLog", "erster-tag"],
      ["missionLog", "halbfertig"],
      ["archiveEntry", "deep-space-12"],
      ["mission", "deneb"],
    ]);
  });

  it("zeigt kein Werkzeug an einem fremden Gespräch", () => {
    renderBrowser({ ownUserId: 99 });

    expect(
      screen
        .getAllByTestId("link-tool")
        .every((el) => el.dataset.type !== "dialogue"),
    ).toBe(true);
  });

  it("lässt das Werkzeug an Missionen weg, wo das Recht dafür fehlt", () => {
    // Die Missionsliste zeigt der Spielleitung ALLE Missionen, auch fremde —
    // ohne content.autolink_tools stünde dort ein Knopf, den der Server
    // ablehnt. Die eigenen Logbücher und Einträge bleiben davon unberührt.
    renderBrowser({ canLinkAnyContent: false });

    const types = screen
      .getAllByTestId("link-tool")
      .map((el) => el.dataset.type);
    expect(types).toEqual(["missionLog", "missionLog", "archiveEntry"]);
  });

  it("hält auf dem Telefon Abstand zwischen Aktionszeile und nächstem Eintrag", () => {
    renderBrowser();

    // Auf schmalen Schirmen steht die Zeile UNTER der Karte — deren
    // margin-bottom trennt dann Karte und Zeile statt die Einträge, die
    // Knöpfe klebten am nächsten Eintrag. Ab sm stehen beide nebeneinander,
    // dort trennt wieder die Karte selbst.
    const rows = [...document.querySelectorAll(".content-action-row")];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).toContain("mb-[12px]");
      expect(row.className).toContain("sm:mb-0");
    }
  });
});
