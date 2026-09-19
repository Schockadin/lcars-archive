import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DialogueReplyForm from "./DialogueReplyForm";

// Die Server-Action zieht die halbe Datenschicht nach — hier gemockt, geprüft
// wird, WO das Formular landet (siehe .dialogue-reply-dock in archive.css).
vi.mock("@/app/actions/dialogues", () => ({
  postDialogueMessageAction: vi.fn(async () => ({})),
}));
// Der Markdown-Editor fragt beim Mounten serverseitig die Rechtschreib-
// Einstellung ab (cookies()) — im Test ohne Request-Kontext.
vi.mock("@/app/_shared/MarkdownEditor", () => ({
  default: ({ id, rows }: { id: string; rows?: number }) => (
    <textarea id={id} name="bodyMarkdown" rows={rows} />
  ),
}));

const CHARS = [{ key: "c1", name: "Ada" }];

function renderForm(
  props: Partial<Parameters<typeof DialogueReplyForm>[0]> = {},
) {
  return render(
    <DialogueReplyForm entrySlug="gespraech" replyCharacters={CHARS} {...props} />,
  );
}

function pinBox(): HTMLInputElement {
  return screen.getByRole("checkbox", { name: "Feld angeheftet" });
}

describe("DialogueReplyForm", () => {
  it("stellt das Formular in den am Rand klebenden Kasten", () => {
    const { container } = renderForm();

    const dock = container.querySelector(".dialogue-reply-dock");
    expect(dock).not.toBeNull();
    // Das Formular MUSS darin liegen, sonst klebt es nicht mit.
    expect(dock?.querySelector("form")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Senden" })).toBeTruthy();
  });

  // Der Kasten trägt Rahmen und Hintergrund — ein leerer bliebe als Balken
  // am Bildrand stehen.
  it("rendert gar nichts, wenn gerade jemand anderes am Zug ist", () => {
    const { container } = renderForm({ canReplyNow: false });

    expect(container.querySelector(".dialogue-reply-dock")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("zeigt auch den Wartehinweis im Kasten", () => {
    const { container } = renderForm({ hasOnlyBlockedCharacter: true });

    const dock = container.querySelector(".dialogue-reply-dock");
    expect(dock?.textContent).toContain("zuletzt am Zug");
    expect(dock?.querySelector("form")).toBeNull();
  });

  describe("Checkbox „Feld angeheftet\u201c", () => {
    it("ist angehakt, solange der Kasten klebt", () => {
      renderForm();

      expect(pinBox().checked).toBe(true);
    });

    it("meldet das Abwählen nach oben", () => {
      const onStickyChange = vi.fn();
      renderForm({ onStickyChange });

      fireEvent.click(pinBox());

      expect(onStickyChange).toHaveBeenCalledWith(false);
    });

    it("nimmt dem Kasten abgewählt das Kleben", () => {
      const { container } = renderForm({ sticky: false });

      const dock = container.querySelector(".dialogue-reply-dock");
      expect(dock?.classList.contains("dialogue-reply-dock--loose")).toBe(true);
      expect(pinBox().checked).toBe(false);
    });

    // Sonst überschrieben sich Entwurfs-Sicherung und gemerkte Wahl
    // gegenseitig (siehe INPUT_DRAFT_OPT_OUT_ATTR in src/lib/inputDraft.ts).
    it("ist von der Entwurfs-Sicherung ausgenommen", () => {
      renderForm();

      expect(pinBox().hasAttribute("data-no-draft")).toBe(true);
    });

    // Der Haken steht IM Formular, und das setzt sich nach erfolgreichem
    // Senden selbst zurück (formRef.reset()). Für einen kontrollierten
    // Haken stellt React den Zustand danach wieder her — diese Zusicherung
    // hält der Fall fest, damit ein späteres defaultChecked nicht
    // unbemerkt einen Haken zurücklässt, der nicht mehr zum Kasten passt.
    it("überlebt das Zurücksetzen des Formulars nach dem Senden", () => {
      const { container } = renderForm();
      const form = container.querySelector("form")!;

      act(() => {
        form.reset();
      });

      expect(pinBox().checked).toBe(true);
    });

    it("gilt auch für den Wartehinweis", () => {
      const { container } = renderForm({
        hasOnlyBlockedCharacter: true,
        sticky: false,
      });

      expect(
        container.querySelector(".dialogue-reply-dock--loose"),
      ).not.toBeNull();
    });
  });

  it("hält das Textfeld kompakt, weil der Kasten dauerhaft im Bild steht", () => {
    renderForm();

    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(field.rows).toBe(4);
  });
});
