import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastProvider";

function Trigger({
  message,
  duration,
}: {
  message: string;
  duration?: number;
}) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(message, { kind: "success", duration })}>
      go
    </button>
  );
}

describe("ToastProvider / useToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("zeigt einen Toast nach showToast und blendet ihn manuell aus", () => {
    render(
      <ToastProvider>
        <Trigger message="Gespeichert" duration={0} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByText("Gespeichert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByText("Gespeichert")).toBeNull();
  });

  it("blendet den Toast nach Ablauf der Dauer automatisch aus", () => {
    render(
      <ToastProvider>
        <Trigger message="Weg gleich" duration={3000} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByText("Weg gleich")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("Weg gleich")).toBeNull();
  });

  it("useToast ohne Provider ist ein No-op (kein Fehler)", () => {
    // Rendert Trigger ohne umschließenden ToastProvider — showToast darf nicht
    // werfen.
    expect(() => {
      render(<Trigger message="x" />);
      fireEvent.click(screen.getByText("go"));
    }).not.toThrow();
  });
});
