import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import type { CharacterStats } from "@/types/characterStats";
import type { CharacterEditorTab } from "../_shared/CharacterEditorTabs";
import RuleModuleCharacterSections from "./RuleModuleCharacterSections";
import TechnomageSpellsPanel from "./TechnomageSpellsPanel";

export function ruleModuleCharacterTabs({
  modules,
  userId,
  characterId,
  stats,
  earnedAp,
}: {
  modules: RuleModuleDefinition[];
  userId: number;
  characterId: number;
  stats: CharacterStats;
  earnedAp: number;
}): CharacterEditorTab[] {
  return modules
    .filter((module) => module.characterTab?.enabled)
    .flatMap((module): CharacterEditorTab[] => {
      const moduleTab: CharacterEditorTab = {
        id: `module-${module.id}`,
        label:
          module.id === "technomage"
            ? "Technomage"
            : module.characterTab?.label || module.name,
        content: (
          <RuleModuleCharacterSections
            modules={[module]}
            userId={userId}
            characterId={characterId}
            stats={stats}
            earnedAp={earnedAp}
          />
        ),
      };
      if (module.id !== "technomage") return [moduleTab];
      return [
        moduleTab,
        {
          id: "module-technomage-spells",
          label: "Spells",
          content: (
            <TechnomageSpellsPanel
              userId={userId}
              characterId={characterId}
              stats={stats}
              earnedAp={earnedAp}
              moduleDefinition={module}
            />
          ),
        },
      ];
    });
}
