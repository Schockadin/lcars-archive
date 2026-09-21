import { describe, expect, it, afterEach, vi } from "vitest";
import {
  panelStorageKey,
  PANEL_OPEN_PREFIX,
  readPanelOpen,
  writePanelOpen,
} from "./panelState";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("panelState", () => {
  it("legt jeden Abschnitt unter einem eigenen, erkennbaren Schlüssel ab", () => {
    expect(panelStorageKey("dashboard:news")).toBe(
      `${PANEL_OPEN_PREFIX}dashboard:news`,
    );
  });

  // Der Kern: Ohne Eintrag gibt es keine Antwort, und der Aufrufer nimmt
  // seine Vorgabe. Käme hier false heraus, stünde jeder Abschnitt beim
  // ersten Besuch zugeklappt da.
  it("weiß nichts über einen Abschnitt, den niemand angefasst hat", () => {
    expect(readPanelOpen("dashboard:news")).toBeNull();
  });

  it("gibt zurück, was geschrieben wurde — in beide Richtungen", () => {
    writePanelOpen("dashboard:news", false);
    expect(readPanelOpen("dashboard:news")).toBe(false);

    writePanelOpen("dashboard:news", true);
    expect(readPanelOpen("dashboard:news")).toBe(true);
  });

  it("hält die Abschnitte auseinander", () => {
    writePanelOpen("dashboard:news", false);
    expect(readPanelOpen("dashboard:gespraeche")).toBeNull();
  });

  it("liest einen fremden Wert nicht als Zustand", () => {
    window.localStorage.setItem(panelStorageKey("dashboard:news"), "offen");
    expect(readPanelOpen("dashboard:news")).toBeNull();
  });

  // Privates Fenster, gesperrte Websitedaten: localStorage wirft. Das darf
  // die Seite nicht mitreißen — dann gilt eben die Vorgabe.
  it("übersteht einen Speicher, der wirft", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(readPanelOpen("dashboard:news")).toBeNull();
    expect(() => writePanelOpen("dashboard:news", false)).not.toThrow();
  });
});
