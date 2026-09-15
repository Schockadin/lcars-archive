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
