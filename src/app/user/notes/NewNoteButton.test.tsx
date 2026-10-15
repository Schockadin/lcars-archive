import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewNoteButton from "./NewNoteButton";

const { createMyNoteAction, getNoteTargetsAction, refresh } = vi.hoisted(
  () => ({
    createMyNoteAction: vi.fn(),
    getNoteTargetsAction: vi.fn(),
    refresh: vi.fn(),
  }),
);
vi.mock("./actions", () => ({ createMyNoteAction, getNoteTargetsAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("NewNoteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNoteTargetsAction.mockResolvedValue([
      { type: "character", slug: "tuvok", label: "Tuvok" },
    ]);
    createMyNoteAction.mockResolvedValue({});
  });

  it("erstellt eine Notiz ohne Zuordnung", async () => {
    const onCreated = vi.fn();
    render(<NewNoteButton onCreated={onCreated} />);
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    expect(getNoteTargetsAction).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Neue Notiz" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Inhalt" }), {
      target: { value: "Ein freier Gedanke" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Notiz speichern" }));
    await waitFor(() =>
      expect(createMyNoteAction).toHaveBeenCalledWith({
        body: "Ein freier Gedanke",
        visibility: "private",
        targetType: null,
        targetSlug: null,
      }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("ordnet die Notiz auf Wunsch einem sichtbaren Eintrag zu", async () => {
    render(<NewNoteButton />);
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.click(screen.getByRole("button", { name: "Inhalt auswählen" }));
    expect(
      screen.getByRole("dialog", { name: "Inhalt auswählen" }),
    ).toBeInTheDocument();
    await screen.findByRole("button", { name: "Tuvok — Charakter auswählen" });
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Einträge für die Notiz suchen" }),
      {
        target: { value: "Tuvok" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Tuvok — Charakter auswählen" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Neue Notiz" }),
    ).toHaveTextContent("Tuvok (Charakter)");
    fireEvent.change(screen.getByRole("combobox", { name: "Sichtbarkeit" }), {
      target: { value: "group" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Inhalt" }), {
      target: { value: "Für alle" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Notiz speichern" }));
    await waitFor(() =>
      expect(createMyNoteAction).toHaveBeenCalledWith({
        body: "Für alle",
        visibility: "group",
        targetType: "character",
        targetSlug: "tuvok",
      }),
    );
  });

  it("lässt die Zielsuche abbrechen und eine Zuordnung wieder entfernen", async () => {
    render(<NewNoteButton />);
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.click(screen.getByRole("button", { name: "Inhalt auswählen" }));
    await screen.findByRole("button", { name: "Tuvok — Charakter auswählen" });
    fireEvent.click(
      screen.getByRole("button", { name: "Tuvok — Charakter auswählen" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Zuordnung entfernen" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Neue Notiz" }),
    ).toHaveTextContent("Ohne Eintrag");
  });
});
