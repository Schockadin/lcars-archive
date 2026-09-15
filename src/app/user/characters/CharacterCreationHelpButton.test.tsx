import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterCreationHelpButton from "./CharacterCreationHelpButton";

// Der Knopf über der eigenen Charakterliste zeigt denselben Text, der in der
// Anleitung unter „Charaktererschaffung" steht — geprüft wird deshalb nicht
// der Wortlaut, sondern dass das Fenster überhaupt aufgeht, den Text der
// gemeinsamen Komponente trägt und sich wieder schließen lässt.
describe("CharacterCreationHelpButton", () => {
  it("zeigt den Text erst nach einem Klick", () => {
    render(<CharacterCreationHelpButton />);

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Erschaffung erklärt" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Charaktererschaffung",
    });
    expect(dialog).toHaveTextContent("Einen neuen Charakter");
    expect(dialog).toHaveTextContent("Stammdaten");
  });

  // Der Text ist lang und wird MITTEN im Anlegen aufgeschlagen — wer etwas
  // Bestimmtes sucht, braucht Überschriften zum Springen, keine Absatzwüste.
  it("gliedert den Text in benannte Abschnitte", () => {
    render(<CharacterCreationHelpButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Erschaffung erklärt" }),
    );

    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual([
      "Die vier Schritte",
      "Das Portrait und sein Ausschnitt",
      "Werte eintragen",
      "Erfahrungspunkte (AP)",
      "Talente",
      "Schwerpunkte",
      "Nach dem Abschließen",
      "Wenn die Erschaffung wieder geöffnet wird",
    ]);
  });

  // Die Schemata sind Inhalt, keine Dekoration: Sie zeigen den Aufbau der
  // jeweiligen Maske und tragen deshalb eine eigene Beschriftung.
  it("zeigt zu den Abschnitten beschriftete Beispielbilder", () => {
    render(<CharacterCreationHelpButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Erschaffung erklärt" }),
    );

    const figures = screen.getAllByRole("img");
    expect(figures.length).toBeGreaterThanOrEqual(6);
    for (const figure of figures) {
      expect(figure.getAttribute("aria-label")).toBeTruthy();
    }
  });

  // Der Knopf steht in drei verschiedenen Leisten (Übersicht, Assistent,
  // Charakterseite) und muss sich in jede einfügen können.
  it("übernimmt die Klassen der Leiste, in der er steht", () => {
    render(<CharacterCreationHelpButton className="eigene-klasse" />);

    expect(
      screen.getByRole("button", { name: "Erschaffung erklärt" }).className,
    ).toBe("eigene-klasse");
  });

  // Der Deep-Link muss auf den Anker der Anleitung zeigen — sonst landet man
  // oben auf /tutorial statt im passenden Abschnitt.
  it("verlinkt den passenden Abschnitt der Anleitung", () => {
    render(<CharacterCreationHelpButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Erschaffung erklärt" }),
    );

    expect(
      screen
        .getByRole("link", { name: "Derselbe Abschnitt in der Anleitung" })
        .getAttribute("href"),
    ).toBe("/tutorial#charaktererschaffung");
  });

  it("schließt das Fenster über das Kreuz wieder", () => {
    render(<CharacterCreationHelpButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "Erschaffung erklärt" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
