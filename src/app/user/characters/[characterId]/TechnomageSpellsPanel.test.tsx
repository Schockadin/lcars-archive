import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import TechnomageSpellsPanel from "./TechnomageSpellsPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../_shared/technomageActions", () => ({
  buyTechnomageSpellAction: vi.fn(),
  configureTechnomageSchoolsAction: vi.fn(),
  updateTechnomagePowerPointsAction: vi.fn(),
}));

describe("TechnomageSpellsPanel", () => {
  it("zeigt zuerst die gelernte Spellliste und danach den einklappbaren Kaufbereich", () => {
    const stats = {
      ...EMPTY_CHARACTER_STATS,
      attributes: { ...EMPTY_CHARACTER_STATS.attributes, reason: 9 },
    };
    const { container } = render(
      <TechnomageSpellsPanel
        userId={7}
        characterId={12}
        stats={stats}
        earnedAp={40}
        moduleDefinition={TECHNOMAGE_RULE_MODULE}
      />,
    );

    const spellList = container
      .querySelector("#learned-spells-title")
      ?.closest("section");
    const purchasePanel = spellList?.nextElementSibling;

    expect(spellList).toHaveClass("stat-sheet-section");
    expect(spellList).toHaveTextContent("Spellliste // Gelernte Spells");
    expect(purchasePanel?.tagName).toBe("DETAILS");
    expect(purchasePanel).not.toHaveAttribute("open");
    expect(purchasePanel).toHaveTextContent("Spells kaufen");
    expect(container.querySelectorAll("details")).toHaveLength(1);
  });
});
