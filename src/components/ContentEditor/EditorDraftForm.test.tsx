import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorDraftForm from "./EditorDraftForm";

const { loadDraft, saveDraft } = vi.hoisted(() => ({
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
}));

vi.mock("@/app/actions/editorDrafts", () => ({
  loadEditorDraft: loadDraft,
  saveEditorDraft: saveDraft,
}));

function renderDraftForm() {
  return render(
    <EditorDraftForm
      aria-label="Editor"
      draftScope="archive-entry:42"
      editorDraft={{ type: "archive", contentId: 42 }}
    >
      <input name="title" defaultValue="Original" />
      <textarea name="bodyMarkdown" defaultValue="Original body" />
      <button type="submit">Speichern</button>
    </EditorDraftForm>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  loadDraft.mockReset();
  saveDraft.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EditorDraftForm", () => {
  it("stellt einen gespeicherten DB-Entwurf wieder her, ohne ihn erneut zu speichern", async () => {
    loadDraft.mockResolvedValue({
      fields: { title: "Gesicherter Titel", bodyMarkdown: "Gesicherter Text" },
      revision: 3,
    });
    renderDraftForm();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getAllByRole("textbox")[0]).toHaveValue("Gesicherter Titel");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Gespeicherter Entwurf wiederhergestellt.",
    );
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("speichert nach fünf Sekunden Ruhe und zeigt den bestätigten Stand an", async () => {
    loadDraft.mockResolvedValue(null);
    saveDraft.mockResolvedValue({ ok: true, revision: 1 });
    renderDraftForm();
    await act(async () => {
      await Promise.resolve();
    });

    const title = screen.getAllByRole("textbox")[0];
    fireEvent.input(title, { target: { value: "Neue Fassung" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_999);
    });
    expect(saveDraft).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(saveDraft).toHaveBeenCalledWith("archive", 42, null, {
      title: "Neue Fassung",
      bodyMarkdown: "Original body",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Entwurf gespeichert.");
  });

  it("speichert bei durchgehendem Tippen spätestens nach fünf Sekunden", async () => {
    loadDraft.mockResolvedValue(null);
    saveDraft.mockResolvedValue({ ok: true, revision: 1 });
    renderDraftForm();
    await act(async () => {
      await Promise.resolve();
    });

    const title = screen.getAllByRole("textbox")[0];
    fireEvent.input(title, { target: { value: "Erster Stand" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    fireEvent.input(title, { target: { value: "Weitergetippt" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("blockiert das normale Speichern nicht, wenn der Zwischenstand nicht gespeichert werden kann", async () => {
    loadDraft.mockResolvedValue(null);
    saveDraft.mockResolvedValue({ ok: false });
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});
    renderDraftForm();
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.input(screen.getAllByRole("textbox")[0], {
      target: { value: "Explizit speichern" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Editor" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    requestSubmit.mockRestore();
  });
});
