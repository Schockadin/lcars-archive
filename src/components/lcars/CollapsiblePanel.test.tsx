import { describe, expect, it, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import CollapsiblePanel from "./CollapsiblePanel";
import { panelStorageKey } from "@/lib/panelState";

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
