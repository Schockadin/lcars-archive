import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import RevisionsPanel from "./RevisionsPanel";
import type { ContentRevision } from "@/lib/contentRevisionTypes";

// Die Server-Action zieht die Datenschicht nach — hier zählt, was das Panel
// mit ihrem Ergebnis macht.
const restore = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/revisions", () => ({
  restoreRevisionAction: restore,
}));

// FormError meldet über den Toast-Provider — den gibt es hier nicht.
vi.mock("@/app/_shared/FormPrimitives", () => ({
  FormError: () => null,
}));

const revision: ContentRevision = {
  id: 7,
  title: "Bericht über Deneb",
  createdAt: "2026-09-19T08:00:00.000Z",
  editorName: "Ada",
  length: 42,
  excerpt: "Die frühere Fassung …",
};

const reload = vi.fn();

beforeEach(() => {
  restore.mockReset();
  reload.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPanel() {
  render(
    <RevisionsPanel
      contentType="archive"
      contentId={3}
      path="/user/archive/3/edit"
      revisions={[revision]}
      defaultOpen
    />,
  );
}

async function wiederherstellen() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Wiederherstellen" }));
  });
}

describe("RevisionsPanel", () => {
  it("beginnt auf der Charakterseite geöffnet", () => {
    renderPanel();
    expect(document.querySelector("details")).toHaveAttribute("open");
  });

  it("lädt nach erfolgreicher Wiederherstellung die Seite neu", async () => {
    restore.mockResolvedValue({ success: true });
    renderPanel();

    await wiederherstellen();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("lässt bei einem Fehler alles stehen", async () => {
    restore.mockResolvedValue({ error: "Diese Fassung gibt es nicht mehr." });
    renderPanel();

    await wiederherstellen();

    expect(reload).not.toHaveBeenCalled();
  });

  it("schickt Inhalt, Fassung und Pfad an die Action", async () => {
    restore.mockResolvedValue({ success: true });
    renderPanel();

    await wiederherstellen();

    const formData = restore.mock.calls[0][1] as FormData;
    expect(formData.get("contentType")).toBe("archive");
    expect(formData.get("contentId")).toBe("3");
    expect(formData.get("revisionId")).toBe("7");
    expect(formData.get("path")).toBe("/user/archive/3/edit");
  });
});
