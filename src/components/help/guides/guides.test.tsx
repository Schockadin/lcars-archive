import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GmAreaGuides from "./GmGuides";
import UserAreaGuides from "./UserGuides";
import PublicAreaGuides from "./PublicGuides";

// Die Bereichs-Anleitungen sind dasselbe Versprechen wie die
// Charaktererschaffung: benannte Abschnitte mit einem beschrifteten Schema
// daneben. Geprüft wird nicht der Wortlaut (der ändert sich mit jedem
// Ausbau), sondern dass jeder Bereich des Menüs vorkommt und keine Abbildung
// ohne Beschriftung dasteht.

function ueberschriften(): string[] {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent ?? "");
}

function erwarteBeschrifteteBilder(mindestens: number) {
  const figures = screen.getAllByRole("img");
  expect(figures.length).toBeGreaterThanOrEqual(mindestens);
  for (const figure of figures) {
    expect(figure.getAttribute("aria-label")).toBeTruthy();
  }
}

describe("Anleitungen zu den Leitungs-Bereichen", () => {
  // Zehn Einträge hat das Leitungs-Menü (siehe GM_ITEMS in
  // HeaderUserNav.tsx) — jeder braucht seine Erklärung, sonst steht auf einer
  // Seite ein Fragezeichen ohne Antwort.
  it("erklärt jeden der zehn Menüpunkte", () => {
    render(<GmAreaGuides />);
    const text = ueberschriften().join(" | ");

    for (const bereich of [
      "Kampagne",
      "Sessions",
      "Charaktere",
      "Gruppenblatt",
      "AP",
      "Talente",
      "Schwerpunkte",
      "Eigene Regeln",
      "Chronologie",
      "Gespräche",
    ]) {
      expect(text).toContain(bereich);
    }
  });

  it("stellt jedem Bereich ein beschriftetes Schema zur Seite", () => {
    render(<GmAreaGuides />);
    erwarteBeschrifteteBilder(10);
  });
});

describe("Anleitungen zum eigenen Bereich", () => {
  it("erklärt die Startseite, „Meine Inhalte“ und das Profil", () => {
    render(<UserAreaGuides />);
    const text = ueberschriften().join(" | ");

    expect(text).toContain("Startseite");
    expect(text).toContain("Meine Inhalte");
    expect(text).toContain("Profil");
    erwarteBeschrifteteBilder(2);
  });

  // Das Zahnrad neben der Überschrift ist der einzige Weg zu den
  // Dashboard-Einstellungen — steht er nicht in der Anleitung, findet ihn
  // niemand.
  it("nennt den Weg zum Ein- und Ausschalten der Sektionen", () => {
    render(<UserAreaGuides />);
    expect(screen.getAllByText(/Zahnrad/).length).toBeGreaterThan(0);
  });

  // Der Import ist der einzige Knopf der Anlege-Leiste, der auf eine eigene
  // Seite führt — und der einzige, bei dem der Server zwei Dinge anders
  // entscheidet als die hochgeladene Datei. Beides gehört in die Anleitung,
  // sonst wirkt eine abgewiesene Datei wie ein Fehler.
  it("erklärt den Import samt seiner beiden Grenzen", () => {
    render(<UserAreaGuides />);
    expect(ueberschriften().join(" | ")).toContain("Import");

    expect(screen.getAllByText(/gehört dir/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/eigenen, veröffentlichten Figur/).length,
    ).toBeGreaterThan(0);
  });
});

describe("Anleitungen zu den öffentlichen Seiten", () => {
  // Fünf Einträge hat das Hauptmenü (MAIN_NAV) — und ohne Konto ist der
  // Fragezeichen-Knopf auf der Seite die einzige Erklärung, die es gibt.
  it("erklärt jede der fünf öffentlichen Seiten", () => {
    render(<PublicAreaGuides />);
    const text = ueberschriften().join(" | ");

    for (const seite of [
      "Startseite",
      "Charakterliste",
      "Zeitstrahl",
      "Datenbank",
      "Suche",
    ]) {
      expect(text).toContain(seite);
    }
    erwarteBeschrifteteBilder(5);
  });
});
