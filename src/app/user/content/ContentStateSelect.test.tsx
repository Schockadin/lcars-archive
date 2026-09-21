import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ContentStateSelect from "./ContentStateSelect";

const setContentStateAction = vi.fn(async () => ({}) as { error?: string });
vi.mock("./actions", () => ({
  setContentStateAction: (...args: unknown[]) =>
    (setContentStateAction as unknown as (...a: unknown[]) => Promise<{ error?: string }>)(
      ...args,
    ),
}));

function option(label: string): HTMLButtonElement {
  return screen.getByRole("button", { name: label }) as HTMLButtonElement;
}

describe("ContentStateSelect", () => {
  beforeEach(() => {
    setContentStateAction.mockClear();
  });

  it("zeigt den aktuellen Zustand als gedrückte Option", () => {
    render(<ContentStateSelect contentType="archive_entry" id={7} isDraft />);
    expect(option("Entwurf")).toHaveAttribute("aria-pressed", "true");
    expect(option("Veröffentlicht")).toHaveAttribute("aria-pressed", "false");
  });

  it("schreibt den neuen Zustand beim Klick auf die andere Option", async () => {
    render(<ContentStateSelect contentType="mission_log" id={7} isDraft />);
    await act(async () => {
      fireEvent.click(option("Veröffentlicht"));
    });
    expect(setContentStateAction).toHaveBeenCalledWith("mission_log", 7, "published");
  });

  // Regression: Der Zustand hing an einem <select>. Ein geschlossenes,
  // fokussiertes <select> wechselt bei jedem Pfeiltasten-Druck (und in
  // Firefox beim Mausrad) zur nächsten Option und feuert dabei change — wer
  // einen Inhalt auf „Entwurf" stellte und danach mit der Tastatur
  // weiterscrollte, veröffentlichte ihn Sekunden später versehentlich wieder,
  // inklusive Benachrichtigung an alle Abonnenten. Knöpfe kennen diese Drift
  // nicht.
  it("veröffentlicht nicht durch Pfeiltasten oder Mausrad auf dem Schalter", async () => {
    render(<ContentStateSelect contentType="dialogue" id={7} isDraft />);
    const active = option("Entwurf");
    active.focus();
    await act(async () => {
      fireEvent.keyDown(active, { key: "ArrowDown" });
      fireEvent.keyUp(active, { key: "ArrowDown" });
      fireEvent.wheel(active, { deltaY: 200 });
      fireEvent.keyDown(active, { key: "PageDown" });
    });
    expect(setContentStateAction).not.toHaveBeenCalled();
    expect(option("Entwurf")).toHaveAttribute("aria-pressed", "true");
  });

  it("schreibt nichts, wenn die bereits aktive Option ausgelöst wird", async () => {
    render(<ContentStateSelect contentType="character" id={7} isDraft={false} />);
    await act(async () => {
      fireEvent.click(option("Veröffentlicht"));
    });
    expect(setContentStateAction).not.toHaveBeenCalled();
  });

  // Für Listen, die nur Entwürfe führen (DraftsSection auf der Startseite und
  // unter „Meine Inhalte"): Der Eintrag gehört nach dem Veröffentlichen nicht
  // mehr dorthin. Der Rückruf läuft in DERSELBEN Transition wie die Action,
  // damit React ihn bei einem Fehlschlag von selbst zurücknimmt.
  it("meldet das Veröffentlichen, nicht aber das Zurückziehen", async () => {
    const onPublished = vi.fn();
    const { rerender } = render(
      <ContentStateSelect
        contentType="archive_entry"
        id={7}
        isDraft
        onPublished={onPublished}
      />,
    );
    await act(async () => {
      fireEvent.click(option("Veröffentlicht"));
    });
    expect(onPublished).toHaveBeenCalledTimes(1);

    // Der Weg zurück ist kein Anlass: Ein Inhalt, der wieder Entwurf wird,
    // gehört ja gerade in diese Liste.
    rerender(
      <ContentStateSelect
        contentType="archive_entry"
        id={7}
        isDraft={false}
        onPublished={onPublished}
      />,
    );
    await act(async () => {
      fireEvent.click(option("Entwurf"));
    });
    expect(onPublished).toHaveBeenCalledTimes(1);
  });

  it("zeigt den Fehler der Action an", async () => {
    setContentStateAction.mockResolvedValueOnce({ error: "Änderung fehlgeschlagen." });
    render(<ContentStateSelect contentType="archive_entry" id={7} isDraft />);
    await act(async () => {
      fireEvent.click(option("Veröffentlicht"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Änderung fehlgeschlagen.",
    );
  });
});
