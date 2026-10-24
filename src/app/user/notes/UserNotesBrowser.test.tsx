import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserNotesBrowser, { noteExcerpt } from "./UserNotesBrowser";

const { getMyNotesAction, editMyNoteAction, deleteMyNoteAction } = vi.hoisted(
  () => ({
    getMyNotesAction: vi.fn(),
    editMyNoteAction: vi.fn(),
    deleteMyNoteAction: vi.fn(),
  }),
);
vi.mock("./actions", () => ({
  getMyNotesAction,
  editMyNoteAction,
  deleteMyNoteAction,
}));
vi.mock("./NewNoteButton", () => ({
  default: () => <button type="button">Neue Notiz</button>,
}));

const own = {
  id: 1,
  body: "Meine **Notiz**",
  bodyHtml: "<p>Meine <strong>Notiz</strong></p>",
  visibility: "private" as const,
  authorId: 1,
  authorName: "Ich",
  createdAt: "2026-10-15",
  updatedAt: "2026-10-15",
  canEdit: true,
  targetLabel: "USS Voyager",
  targetHref: "/characters/voyager",
};
const shared = {
  ...own,
  id: 2,
  body: "Für die Runde",
  bodyHtml: "<p>Für die Runde</p>",
  visibility: "group" as const,
  authorId: 2,
  authorName: "Andere",
  canEdit: false,
  targetLabel: "Mission",
  targetHref: "/chronologie/mission/test",
};

describe("UserNotesBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyNotesAction.mockResolvedValue([own, shared]);
  });

  it("zeigt ChronoRail-Karten und filtert nach Notizart und Text", () => {
    const { container } = render(
      <UserNotesBrowser initialNotes={[own, shared]} />,
    );
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll(".timeline-event")).toHaveLength(2);
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "USS Voyager" })).toHaveAttribute(
      "href",
      own.targetHref,
    );
    expect(screen.getByText("Für die Runde")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Notiz zu „Mission“ bearbeiten" }),
    ).not.toBeInTheDocument();
    expect(noteExcerpt("a".repeat(151))).toBe(`${"a".repeat(150)}…`);

    fireEvent.change(screen.getByLabelText("Nach Notizart filtern"), {
      target: { value: "private" },
    });
    expect(container.querySelectorAll(".timeline-card")).toHaveLength(1);
    expect(screen.getByText("USS Voyager")).toBeInTheDocument();
    expect(screen.queryByText("Mission")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Notizen filtern" }),
      {
        target: { value: "unbekannt" },
      },
    );
    expect(
      screen.getByText("Keine Notizen für diesen Filter."),
    ).toBeInTheDocument();
  });

  it("sortiert nach Eintrag und öffnet die ganze Notiz zum Bearbeiten", async () => {
    editMyNoteAction.mockResolvedValue({});
    getMyNotesAction.mockResolvedValue([
      { ...own, body: "Neu", bodyHtml: "<p>Neu</p>" },
      shared,
    ]);
    render(<UserNotesBrowser initialNotes={[own, shared]} />);
    fireEvent.click(screen.getByRole("button", { name: "Eintrag" }));
    expect(
      [...document.querySelectorAll(".timeline-card-title")].map(
        (title) => title.textContent,
      ),
    ).toEqual(["Mission", "USS Voyager"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Notiz zu „USS Voyager“ anzeigen" }),
    );
    expect(
      screen.getByRole("dialog", { name: /Notiz zu USS Voyager/ }),
    ).toHaveTextContent("Meine Notiz");
    fireEvent.click(screen.getByRole("button", { name: "Notiz bearbeiten" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Inhalt" }), {
      target: { value: "Neu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() =>
      expect(editMyNoteAction).toHaveBeenCalledWith(1, "Neu"),
    );
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent("Neu"),
    );
  });

  it("fragt vor dem Löschen nach", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<UserNotesBrowser initialNotes={[own, shared]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Notiz zu „USS Voyager“ löschen" }),
    );
    expect(confirm).toHaveBeenCalledOnce();
    expect(deleteMyNoteAction).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("zeigt freie Notizen ohne Link als ChronoCard", () => {
    const { container } = render(
      <UserNotesBrowser
        initialNotes={[
          {
            ...own,
            targetLabel: "Ohne Eintrag",
            targetHref: null,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Neue Notiz" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ohne Eintrag")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      container.querySelector(".timeline-event .timeline-rail"),
    ).toBeInTheDocument();
    expect(container.querySelector(".timeline-card")).toBeInTheDocument();
  });
});
