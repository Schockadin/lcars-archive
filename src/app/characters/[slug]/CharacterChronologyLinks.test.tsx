import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CharacterChronologyLinks from "./CharacterChronologyLinks";

describe("CharacterChronologyLinks", () => {
  it("verlinkt alle vier Bereiche auf die Chronologie mit Personenfilter", () => {
    const { container } = render(
      <CharacterChronologyLinks
        characterName="Seven of Nine"
        counts={{ logs: 3, dialogues: 2, missions: 5, events: 7 }}
      />,
    );

    expect(screen.getByRole("link", { name: "Logs" })).toHaveAttribute(
      "href",
      "/chronologie?scope=logs&person=Seven%20of%20Nine",
    );
    expect(screen.getByRole("link", { name: "Gespräche" })).toHaveAttribute(
      "href",
      "/chronologie?scope=dialogues&person=Seven%20of%20Nine",
    );
    expect(screen.getByRole("link", { name: "Missionen" })).toHaveAttribute(
      "href",
      "/chronologie?scope=missions&person=Seven%20of%20Nine",
    );
    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/chronologie?scope=events&person=Seven%20of%20Nine",
    );
    expect(
      [...container.querySelectorAll(".lcars-data-row-label")].map(
        (label) => label.textContent,
      ),
    ).toEqual(["3", "2", "5", "7"]);
  });
});
