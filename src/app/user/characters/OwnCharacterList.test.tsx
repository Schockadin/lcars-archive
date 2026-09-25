import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OwnCharacterList, { type OwnCharacterItem } from "./OwnCharacterList";

vi.mock("../content/ContentStateSelect", () => ({
  default: () => <span>Status</span>,
}));
vi.mock("../content/DeleteOwnContentButton", () => ({
  default: () => <button type="button">Löschen</button>,
}));

const TVEL: OwnCharacterItem = {
  id: 4,
  name: "T'Vel",
  rank: "Lieutenant",
  status: "active",
  isDraft: false,
  hasStats: true,
};

describe("OwnCharacterList", () => {
  it("öffnet die eigene Akte statt der öffentlichen Charakterseite", () => {
    render(<OwnCharacterList characters={[TVEL]} />);

    const ziele = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(ziele).toEqual(["/user/characters/4", "/user/characters/4"]);
    expect(ziele).not.toContain("/characters/t-vel");
  });

  it("führt umgewandelte Charaktere zur Owner-Akte und zum NPC-Eintrag", () => {
    render(<OwnCharacterList characters={[{ ...TVEL, npcSlug: "t-vel" }]} />);

    expect(
      screen.getByRole("link", { name: "NPC ansehen" }).getAttribute("href"),
    ).toBe("/archive/t-vel");
    expect(
      screen.getByRole("link", { name: /T'Vel/ }).getAttribute("href"),
    ).toBe("/user/characters/4");
    expect(screen.queryByRole("button", { name: "Löschen" })).toBeNull();
  });
});
