import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useReturnFocus } from "./useReturnFocus";

// Kleine Harness: ein „Öffnen"-Trigger und ein Overlay (nur gemountet, solange
// offen), das den Fokus über useReturnFocus verwaltet.
function Harness() {
  const [open, setOpen] = useState(false);
  useReturnFocus(open);
  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      {open && <button onClick={() => setOpen(false)}>close</button>}
    </div>
  );
}

describe("useReturnFocus", () => {
  it("gibt den Fokus nach dem Schließen an das auslösende Element zurück", () => {
    render(<Harness />);
    const openBtn = screen.getByText("open");

    openBtn.focus();
    expect(openBtn).toHaveFocus();

    // Öffnen: Effect merkt sich das gerade fokussierte Element (openBtn).
    fireEvent.click(openBtn);
    const closeBtn = screen.getByText("close");
    closeBtn.focus();
    expect(closeBtn).toHaveFocus();

    // Schließen: Cleanup stellt den Fokus auf openBtn wieder her.
    fireEvent.click(closeBtn);
    expect(openBtn).toHaveFocus();
  });

  it("tut nichts, solange inaktiv (kein Fokuswechsel)", () => {
    function Inactive() {
      useReturnFocus(false);
      return <button>a</button>;
    }
    render(<Inactive />);
    const btn = screen.getByText("a");
    btn.focus();
    expect(btn).toHaveFocus();
  });
});
