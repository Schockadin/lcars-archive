import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  ToastProvider,
  useToast,
  type ToastKind,
} from "./ToastProvider";

function Trigger({
  message,
  duration,
  kind = "success",
}: {
  message: string;
  duration?: number;
  kind?: ToastKind;
}) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(message, { kind, duration })}>go</button>
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

  // Farbcodierung nach Status: jede Art bekommt ihre Modifier-Klasse, damit die
  // CSS-Regeln (success = grün, warning = amber, error = rot, info = amber)
  // greifen. Deckt insbesondere die neu hinzugekommene „warning"-Art ab.
  it.each([
    ["success", "lcars-toast--success"],
    ["warning", "lcars-toast--warning"],
    ["error", "lcars-toast--error"],
    ["info", "lcars-toast--info"],
  ] as const)(
    "markiert einen %s-Toast mit der Klasse %s",
    (kind, expectedClass) => {
      render(
        <ToastProvider>
          <Trigger message={`msg-${kind}`} kind={kind} duration={0} />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByText("go"));
      const toast = screen
        .getByText(`msg-${kind}`)
        .closest(".lcars-toast");
      expect(toast).not.toBeNull();
      expect(toast).toHaveClass(expectedClass);
    },
  );

  it("useToast ohne Provider ist ein No-op (kein Fehler)", () => {
    // Rendert Trigger ohne umschließenden ToastProvider — showToast darf nicht
    // werfen.
    expect(() => {
      render(<Trigger message="x" />);
      fireEvent.click(screen.getByText("go"));
    }).not.toThrow();
  });
});
