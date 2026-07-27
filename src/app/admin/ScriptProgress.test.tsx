import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScriptProgress from "./ScriptProgress";

describe("ScriptProgress", () => {
  it("setzt Balkenbreite und aria-valuenow auf den Prozentwert", () => {
    render(<ScriptProgress pct={40} caption="läuft" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    const fill = bar.querySelector(".lcars-progress-bar") as HTMLElement;
    expect(fill.style.width).toBe("40%");
    expect(screen.getByText("läuft")).toBeInTheDocument();
  });

  it("zeigt den Ausblenden-Knopf nur mit onDismiss und ruft ihn beim Klick", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<ScriptProgress pct={100} onDismiss={onDismiss} />);
    const dismiss = screen.getByRole("button", { name: "Ausblenden" });
    fireEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    rerender(<ScriptProgress pct={100} />);
    expect(screen.queryByRole("button", { name: "Ausblenden" })).toBeNull();
  });
});
