import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpButton from "./HelpButton";
import CharacterCreationGuide from "@/components/character/CharacterCreationGuide";

// Der Hilfe-Knopf trägt auf fünfzehn Seiten die jeweilige Bereichs-Anleitung.
// Geprüft wird nicht der Wortlaut eines einzelnen Textes, sondern der Rahmen:
// ein Fragezeichen-Knopf mit Beschriftung, ein Fenster, das erst auf Klick
// aufgeht, der Link in die Anleitung und das Schließen.
//
// Als Inhalt dient die längste der Anleitungen (Charaktererschaffung) —
// vorher hatte sie einen eigenen Knopf mit der Aufschrift „Erschaffung
// erklärt"; seit v1.39 ist auch sie ein Fragezeichen wie überall sonst.
function renderHelp() {
  return render(
    <HelpButton title="Charaktererschaffung" tutorial="charaktererschaffung">
      <CharacterCreationGuide />
    </HelpButton>,
  );
}

function knopf() {
  return screen.getByRole("button", { name: "Hilfe: Charaktererschaffung" });
}

describe("HelpButton", () => {
  it("zeigt den Text erst nach einem Klick", () => {
    renderHelp();

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(knopf());

    const dialog = screen.getByRole("dialog", { name: "Charaktererschaffung" });
    expect(dialog).toHaveTextContent("Einen neuen Charakter");
    expect(dialog).toHaveTextContent("Stammdaten");
  });

  // Ein Icon-Knopf ohne sichtbare Schrift braucht seine Beschriftung im
  // aria-label — und im title, damit auch die Maus erfährt, was er tut.
  it("ist ein Fragezeichen-Knopf mit Beschriftung", () => {
    renderHelp();

    const button = knopf();
    expect(button.className).toContain("lcars-icon-btn");
    expect(button.getAttribute("title")).toBe("Hilfe: Charaktererschaffung");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  // Der Text ist lang und wird MITTEN in der Arbeit aufgeschlagen — wer etwas
  // Bestimmtes sucht, braucht Überschriften zum Springen, keine Absatzwüste.
  it("gliedert den Text in benannte Abschnitte", () => {
    renderHelp();
    fireEvent.click(knopf());

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
    renderHelp();
    fireEvent.click(knopf());

    const figures = screen.getAllByRole("img");
    expect(figures.length).toBeGreaterThanOrEqual(6);
    for (const figure of figures) {
      expect(figure.getAttribute("aria-label")).toBeTruthy();
    }
  });

  // Der Deep-Link muss auf den Anker der Anleitung zeigen — sonst landet man
  // oben auf /tutorial statt im passenden Abschnitt.
  it("verlinkt den passenden Abschnitt der Anleitung", () => {
    renderHelp();
    fireEvent.click(knopf());

    expect(
      screen
        .getByRole("link", { name: "Derselbe Abschnitt in der Anleitung" })
        .getAttribute("href"),
    ).toBe("/tutorial#charaktererschaffung");
  });

  // Ohne Abschnitt (etwa für einen Text, der nirgends sonst steht) entfällt
  // der Link — ein Link auf die Anleitung ohne Ziel wäre eine Sackgasse.
  it("lässt den Link weg, wo es keinen Abschnitt gibt", () => {
    render(
      <HelpButton title="Kampagne">
        <p>Text</p>
      </HelpButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hilfe: Kampagne" }));

    expect(
      screen.queryByRole("link", {
        name: "Derselbe Abschnitt in der Anleitung",
      }),
    ).toBeNull();
  });

  it("schließt das Fenster über das Kreuz wieder", () => {
    renderHelp();
    fireEvent.click(knopf());
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
