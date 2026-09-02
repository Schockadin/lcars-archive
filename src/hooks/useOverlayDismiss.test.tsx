import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { useOverlayDismiss } from "./useOverlayDismiss";

function Overlay({
  active = true,
  onClose,
  onPrev,
  onNext,
}: {
  active?: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useOverlayDismiss(onClose, { active, onPrev, onNext });
  return <div>Overlay</div>;
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("useOverlayDismiss", () => {
  it("schließt per Escape und sperrt solange den Hintergrund-Scroll", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Overlay onClose={onClose} />);

    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("tut nichts, solange das Overlay geschlossen ist", () => {
    const onClose = vi.fn();
    render(<Overlay active={false} onClose={onClose} />);

    expect(document.body.style.overflow).toBe("");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("blättert mit den Pfeiltasten, wenn ein Karussell angeschlossen ist", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<Overlay onClose={vi.fn()} onPrev={onPrev} onNext={onNext} />);

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // Regression: als der Effekt noch in jeder Komponente einzeln stand, hing
  // die Scroll-Sperre mit am onClose-Callback. Ein bei jedem Render neu
  // gebautes onClose ließ sie sich „hidden" als vorherigen Wert merken —
  // der Hintergrund blieb nach dem Schließen dauerhaft gesperrt.
  it("gibt den Scroll auch dann frei, wenn onClose bei jedem Render neu ist", () => {
    function Wrapper({ tick }: { tick: number }) {
      return <Overlay onClose={() => void tick} />;
    }
    const { rerender, unmount } = render(<Wrapper tick={1} />);
    rerender(<Wrapper tick={2} />);
    rerender(<Wrapper tick={3} />);

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
