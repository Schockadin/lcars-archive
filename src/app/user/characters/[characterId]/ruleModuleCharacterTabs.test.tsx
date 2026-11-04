import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import RuleModuleCharacterSections from "./RuleModuleCharacterSections";
import TechnomageSpellsPanel from "./TechnomageSpellsPanel";
import { ruleModuleCharacterTabs } from "./ruleModuleCharacterTabs";

describe("ruleModuleCharacterTabs", () => {
  it("gibt dem Technomage-Modul eigene Tabs für Verwaltung und Spells", () => {
    const tabs = ruleModuleCharacterTabs({
      modules: [TECHNOMAGE_RULE_MODULE],
      userId: 7,
      characterId: 12,
      stats: EMPTY_CHARACTER_STATS,
      earnedAp: 40,
    });

    expect(tabs.map(({ label }) => label)).toEqual(["Technomage", "Spells"]);
    expect((tabs[0].content as ReactElement).type).toBe(
      RuleModuleCharacterSections,
    );
    expect((tabs[1].content as ReactElement).type).toBe(TechnomageSpellsPanel);
  });
});
