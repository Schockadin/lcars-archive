import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ScrollTopButton from "./ScrollTopButton";

// Gescrollt wird in der App .lcars-main-content (siehe MainContent.tsx) —
// der Knopf sucht sich diese Fläche über closest. Hier stellvertretend
// nachgebaut, samt scrollTo, das jsdom nicht kennt.
let scroller: HTMLDivElement;
let scrollTo: ReturnType<typeof vi.fn<(options?: ScrollToOptions) => void>>;

function renderInScroller() {
  scroller = document.createElement("div");
  scroller.className = "lcars-main-content";
  // Der Inhaltsbereich, auf den der Fokus nach dem Sprung wandert (in der
  // App <main id="lcars-main">, siehe MainContent.tsx).
  const main = document.createElement("main");
  main.id = "lcars-main";
  main.tabIndex = -1;
  scroller.appendChild(main);
  document.body.appendChild(scroller);
  const mounted = document.createElement("div");
  scroller.appendChild(mounted);
  return render(<ScrollTopButton />, { container: mounted });
}

function scrollTop(px: number) {
  Object.defineProperty(scroller, "scrollTop", {
    value: px,
    configurable: true,
  });
  fireEvent.scroll(scroller);
}

function button() {
  return screen.queryByRole("button", { name: "Nach oben" });
}

beforeEach(() => {
  scrollTo = vi.fn<(options?: ScrollToOptions) => void>();
  // jsdom kennt scrollTo nicht; die Zuweisung ersetzt es für den Test.
  Element.prototype.scrollTo = scrollTo as Element["scrollTo"];
});

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ScrollTopButton", () => {
  it("bleibt am Seitenanfang unsichtbar", () => {
    renderInScroller();

    expect(button()).toBeNull();
  });

  it("erscheint, sobald es etwas nach oben zu scrollen gibt", () => {
    renderInScroller();

    scrollTop(400);

    expect(button()).not.toBeNull();
  });

  it("verschwindet wieder, wenn man oben angekommen ist", () => {
    renderInScroller();
    scrollTop(400);

    scrollTop(0);

    expect(button()).toBeNull();
  });

  it("springt beim Klick an den Anfang der Scrollfläche", () => {
    renderInScroller();
    scrollTop(400);

    fireEvent.click(button()!);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  // Wer Bewegung abgestellt hat, will keine Fahrt über mehrere
  // Bildschirmhöhen sehen.
  it("springt ohne Animation, wenn Bewegung reduziert werden soll", () => {
    // jsdom kennt matchMedia gar nicht — die Komponente ruft es deshalb
    // optional auf (window.matchMedia?.(…)). Hier wird es gesetzt, nicht
    // bespitzelt, und in afterEach wieder entfernt.
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    renderInScroller();
    scrollTop(400);

    fireEvent.click(button()!);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  // Der Knopf verschwindet oben angekommen; ohne dieses Weiterreichen läge
  // der Fokus danach auf dem Seitenkörper.
  it("reicht den Fokus an den Inhaltsbereich weiter", () => {
    renderInScroller();
    scrollTop(400);

    fireEvent.click(button()!);

    expect(document.activeElement?.id).toBe("lcars-main");
  });

  // Der Kasten ist der Anker, über den der Knopf seine Scrollfläche findet —
  // er muss deshalb auch dann im Baum stehen, wenn nichts zu sehen ist.
  it("hält seinen Kasten auch unsichtbar im Baum", () => {
    const { container } = renderInScroller();

    const dock = container.querySelector(".scroll-top-dock");
    expect(dock).not.toBeNull();
    expect(dock?.getAttribute("aria-hidden")).toBe("true");
  });
});
