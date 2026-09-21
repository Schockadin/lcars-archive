import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import DashboardAutoRefresh, {
  DASHBOARD_REFRESH_INTERVAL_MS,
} from "./DashboardAutoRefresh";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => refresh() }),
}));

// document.hidden ist nur über document.visibilityState zu steuern — beide
// sind Getter, deshalb hier je Test frisch definiert statt zugewiesen.
function setzeSichtbarkeit(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => state === "hidden",
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("DashboardAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
    setzeSichtbarkeit("visible");
    refresh.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rendert nichts", () => {
    const { container } = render(<DashboardAutoRefresh />);
    expect(container).toBeEmptyDOMElement();
  });

  // Zehn Sekunden — die Zahl steht hier ausgeschrieben, weil sie beides
  // bestimmt: wie frisch die Seite ist und wie oft sie neu gerendert wird.
  it("lädt die Seite alle zehn Sekunden neu", () => {
    expect(DASHBOARD_REFRESH_INTERVAL_MS).toBe(10_000);
    render(<DashboardAutoRefresh />);

    // Nicht sofort beim Aufbau: Die Seite wurde gerade gerendert.
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DASHBOARD_REFRESH_INTERVAL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DASHBOARD_REFRESH_INTERVAL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  // „/" ist die meistbesuchte Seite der Anwendung, und ein Refresh rendert
  // sie vollständig neu. Ein vergessener Hintergrund-Tab liefe sonst tagelang
  // im Zehn-Sekunden-Takt gegen die Datenbank.
  it("pausiert, solange der Tab im Hintergrund liegt", () => {
    render(<DashboardAutoRefresh />);

    setzeSichtbarkeit("hidden");
    refresh.mockClear();
    vi.advanceTimersByTime(DASHBOARD_REFRESH_INTERVAL_MS * 5);

    expect(refresh).not.toHaveBeenCalled();
  });

  // Wer zurückkommt, soll nicht bis zu zehn Sekunden auf einen veralteten
  // Stand schauen.
  it("holt beim Zurückkehren sofort frische Daten", () => {
    render(<DashboardAutoRefresh />);
    setzeSichtbarkeit("hidden");
    refresh.mockClear();

    setzeSichtbarkeit("visible");

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // Ein Intervall, das den Abbau überlebt, feuert auf einer Seite weiter,
  // die es gar nicht mehr gibt.
  it("räumt Intervall und Zuhörer beim Abbau ab", () => {
    const { unmount } = render(<DashboardAutoRefresh />);
    unmount();
    refresh.mockClear();

    vi.advanceTimersByTime(DASHBOARD_REFRESH_INTERVAL_MS * 3);
    setzeSichtbarkeit("visible");

    expect(refresh).not.toHaveBeenCalled();
  });
});
