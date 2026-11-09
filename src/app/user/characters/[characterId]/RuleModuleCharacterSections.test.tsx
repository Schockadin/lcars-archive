import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import RuleModuleCharacterSections from "./RuleModuleCharacterSections";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../_shared/ruleModuleActions", () => ({
  saveCharacterRuleModuleAction: vi.fn(),
}));

vi.mock("../_shared/technomageActions", () => ({
  buyTechnomageSpellAction: vi.fn(),
  configureTechnomageSchoolsAction: vi.fn(),
  updateTechnomagePowerPointsAction: vi.fn(),
}));

describe("RuleModuleCharacterSections", () => {
  it("zeigt Power Points und Prestige-Pfade im festen Technomage-Tab", () => {
    const { container } = render(
      <RuleModuleCharacterSections
        modules={[TECHNOMAGE_RULE_MODULE]}
        userId={7}
        characterId={12}
        stats={EMPTY_CHARACTER_STATS}
        earnedAp={40}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Power Points" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Prestige-Pfad" }),
    ).toBeInTheDocument();
    expect(container.querySelector("details")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Spells" }),
    ).not.toBeInTheDocument();
  });
});
