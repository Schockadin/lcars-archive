import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import CollapsiblePanel from "./CollapsiblePanel";
import { panelStorageKey } from "@/lib/panelState";

// jsdom kennt scrollIntoView nicht — gleiche Attrappe wie in
// DialogueLiveView.test.tsx, sonst wirft der Anker-Zweig in der
// requestAnimationFrame-Rückrufliste, wo es kein Test mehr auffängt.
let scrollIntoView: ReturnType<typeof vi.fn<Element["scrollIntoView"]>>;

beforeEach(() => {
  scrollIntoView = vi.fn<Element["scrollIntoView"]>();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  window.localStorage.clear();
  window.location.hash = "";
});

function panel(): HTMLDetailsElement {
  return document.querySelector("details") as HTMLDetailsElement;
}

// jsdom führt das native Auf-/Zuklappen eines <summary>-Klicks nicht aus —
// der Browser tut das, jsdom nicht. Also genau das nachstellen, was er täte:
// open umsetzen und das toggle-Ereignis feuern.
function klappeZu(): void {
  const details = panel();
  act(() => {
    details.open = false;
    details.dispatchEvent(new Event("toggle"));
  });
}

describe("CollapsiblePanel", () => {
  it("steht per Vorgabe offen", () => {
    render(
      <CollapsiblePanel title="News" storageId="dashboard:news">
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(true);
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  it("zeigt Titel und Kurzinfo in der Kopfzeile", () => {
    render(
      <CollapsiblePanel title="Offene Gespräche" badge={3}>
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    expect(screen.getByText("Offene Gespräche")).toBeInTheDocument();
    // Die Zahl stand vorher links in der DataRow — sie darf beim Umbau nicht
    // verloren gehen, sonst verschweigt ein zugeklappter Abschnitt, wie viel
    // darin steckt.
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("merkt sich das Zuklappen", () => {
    render(
      <CollapsiblePanel title="News" storageId="dashboard:news">
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    klappeZu();

    expect(window.localStorage.getItem(panelStorageKey("dashboard:news"))).toBe(
      "0",
    );
  });

  it("kommt zugeklappt wieder, wenn man ihn so verlassen hat", () => {
    window.localStorage.setItem(panelStorageKey("dashboard:news"), "0");

    render(
      <CollapsiblePanel title="News" storageId="dashboard:news">
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(false);
  });

  it("merkt sich nichts ohne storageId", () => {
    render(
      <CollapsiblePanel title="News">
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    klappeZu();

    expect(window.localStorage.length).toBe(0);
    expect(panel().open).toBe(false);
  });

  // Der Fall, der ohne Vorrang-Regel stillschweigend kaputtginge: Das
  // Zahnrad auf der Startseite führt auf /user#dashboard. Wer den Abschnitt
  // beim letzten Mal zugeklappt hat, käme sonst dort an und sähe nichts.
  it("lässt den Anker den gemerkten Zustand schlagen", () => {
    window.localStorage.setItem(panelStorageKey("user:startseite"), "0");
    window.location.hash = "#dashboard";

    render(
      <CollapsiblePanel
        title="Startseite"
        htmlId="dashboard"
        storageId="user:startseite"
      >
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(true);
    expect(panel().id).toBe("dashboard");
  });

  it("scrollt den Anker heran, nachdem er aufgeklappt ist", async () => {
    window.location.hash = "#dashboard";

    render(
      <CollapsiblePanel title="Startseite" htmlId="dashboard">
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    // requestAnimationFrame läuft in jsdom über einen Timer.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  // Der Fall, der die Klappen auf /user erst möglich macht: Dort stehen sie
  // per Vorgabe ZU, und /user#password zeigt auf einen Abschnitt INNERHALB
  // von „Settings". Ein geschlossenes <details> versteckt seinen Inhalt — der
  // Browser spränge nirgendwohin, der Link vom Dashboard wäre tot.
  it("klappt auch für einen Anker in seinem Inneren auf", () => {
    window.location.hash = "#password";

    render(
      <CollapsiblePanel
        title="Settings"
        storageId="user:settings"
        defaultOpen={false}
      >
        <section id="password">Passwort ändern</section>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(true);
  });

  it("bleibt zu, wenn der Anker woandershin zeigt", () => {
    window.location.hash = "#editor";

    render(
      <CollapsiblePanel
        title="Settings"
        storageId="user:settings"
        defaultOpen={false}
      >
        <section id="password">Passwort ändern</section>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(false);
  });

  // Vorgabe „zu" heißt nicht „immer zu": Wer den Abschnitt offen verlassen
  // hat, findet ihn offen wieder.
  it("achtet den gemerkten Zustand auch bei der Vorgabe „zu“", () => {
    window.localStorage.setItem(panelStorageKey("user:settings"), "1");

    render(
      <CollapsiblePanel
        title="Settings"
        storageId="user:settings"
        defaultOpen={false}
      >
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(true);
  });

  it("gilt nur für den eigenen Anker", () => {
    window.localStorage.setItem(panelStorageKey("user:darstellung"), "0");
    window.location.hash = "#dashboard";

    render(
      <CollapsiblePanel
        title="Darstellung"
        htmlId="darstellung"
        storageId="user:darstellung"
      >
        <p>Inhalt</p>
      </CollapsiblePanel>,
    );

    expect(panel().open).toBe(false);
  });
});
