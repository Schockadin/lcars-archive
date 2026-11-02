"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormError, FormSuccess, SubmitButton } from "@/app/_shared/FormPrimitives";
import {
  technomageChaosControlDifficulty,
  technomageChaosPointLimit,
} from "@/lib/technomageSpellRules";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import type { CharacterStats, RuleModuleCharacterData } from "@/types/characterStats";
import TechnomageSpellsPanel from "./TechnomageSpellsPanel";
import {
  saveCharacterRuleModuleAction,
  type RuleModuleCharacterState,
} from "../_shared/ruleModuleActions";

const initialState: RuleModuleCharacterState = {};

function ModuleEditor({
  definition,
  saved,
  userId,
  characterId,
  earnedAp,
  insight,
}: {
  definition: RuleModuleDefinition;
  saved: RuleModuleCharacterData;
  userId: number;
  characterId: number;
  earnedAp: number;
  insight: number | null;
}) {
  const [state, action, pending] = useActionState(saveCharacterRuleModuleAction, initialState);
  const router = useRouter();
  const [selectedPrestigeClass, setSelectedPrestigeClass] = useState(saved.prestigeClass ?? "");
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);
  const prestige = definition.prestigeClasses.find((item) => item.id === selectedPrestigeClass);
  const unlockedRank = prestige?.abilities.reduce(
    (rank, ability) => ability.ap <= earnedAp ? Math.max(rank, ability.rank) : rank,
    0,
  ) ?? 0;
  const isTechnomage = definition.id === "technomage";
  const chaosLimit = isTechnomage
    ? technomageChaosPointLimit(
        insight,
        saved.selectedTalents.includes("ordered-mind"),
      )
    : null;
  const chaosPoints = saved.resources["chaos-points"] ?? 0;
  const chaosDifficulty = chaosLimit === null
    ? null
    : technomageChaosControlDifficulty(chaosPoints, chaosLimit);

  return (
    <form action={action} className="flex flex-col gap-[12px]">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="moduleId" value={definition.id} />

      {definition.resources.filter((resource) => !(definition.id === "technomage" && resource.id === "power-points")).length > 0 && (
        <section className="flex flex-col gap-[8px]">
          <h3 className="font-bold">Modul-Ressourcen</h3>
          <div className="grid gap-[10px] sm:grid-cols-2">
            {definition.resources
              .filter((resource) => !(definition.id === "technomage" && resource.id === "power-points"))
              .map((resource) => (
                <label key={resource.id} className="flex flex-col gap-[4px] text-sm">
                  {resource.name} ({resource.abbreviation}) · {resource.maximum}
                  <input
                    className="lcars-input w-full"
                    type="number"
                    name={`resource:${resource.id}`}
                    min={0}
                    max={999999}
                    defaultValue={saved.resources[resource.id] ?? 0}
                    required
                  />
                </label>
              ))}
          </div>
        </section>
      )}

      {definition.statuses.length > 0 && (
        <section className="flex flex-col gap-[6px]">
          <h3 className="font-bold">Modul-Status</h3>
          <div className="flex flex-wrap gap-[10px]">
            {definition.statuses.map((status) => (
              <label key={status.id} className="flex items-center gap-[6px] text-sm">
                <input type="checkbox" name="selectedStatus" value={status.id} defaultChecked={saved.selectedStatuses.includes(status.id)} />
                {status.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {isTechnomage && (
        <p className="text-xs opacity-75">
          Chaos-Kontrollgrenze: {chaosLimit} CP{chaosDifficulty === null
            ? " · keine Kontrollprobe erforderlich"
            : ` · vor dem nächsten Spell Insight + Command, Schwierigkeit ${chaosDifficulty}`}
        </p>
      )}

      {definition.talents.length > 0 && (
        <details className="rounded-[10px] border border-current/20 p-[10px]">
          <summary className="cursor-pointer font-bold">Talente ({saved.selectedTalents.length} dokumentiert)</summary>
          <p className="my-[8px] text-xs opacity-75">
            Markiere hier Module-Talente, die bereits über eine reguläre Talentwahl erworben wurden. Diese Liste vergibt keine Talentwahl und kostet keine zusätzlichen AP.
          </p>
          <div className="grid gap-[8px] md:grid-cols-2">
            {definition.talents.map((item) => (
              <label key={item.id} className="flex gap-[8px] rounded border border-current/15 p-[8px] text-sm">
                {item.repeatable ? (
                  <input type="number" name={`talentCount:${item.id}`} min={0} max={20} defaultValue={saved.selectedTalents.filter((id) => id === item.id).length} aria-label={`${item.name} Anzahl`} className="lcars-input w-[72px] self-start" />
                ) : (
                  <input type="checkbox" name="selectedTalent" value={item.id} defaultChecked={saved.selectedTalents.includes(item.id)} />
                )}
                <span><strong>{item.name}</strong><span className="block text-xs opacity-70">{item.category} · {item.requirements}</span><span className="block mt-[3px]">{item.description}</span></span>
              </label>
            ))}
          </div>
        </details>
      )}

      {definition.prestigeClasses.length > 0 && (
        <section className="flex flex-col gap-[8px] rounded-[10px] border border-current/20 p-[10px]">
          <h3 className="font-bold">Prestige-Pfad</h3>
          <label className="flex flex-col gap-[4px] text-sm">
            Zugehörigkeit
            <select className="lcars-input w-full" name="prestigeClass" value={selectedPrestigeClass} onChange={(event) => setSelectedPrestigeClass(event.target.value)}>
              <option value="">Kein Prestige-Pfad</option>
              {definition.prestigeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {prestige && (
            <>
              <p className="text-sm">{prestige.description}</p>
              <p className="text-xs opacity-75">Aufnahmebedingungen: {prestige.requirements}</p>
              <p className="text-xs opacity-75">Freigeschalteter Prestige-Rang {unlockedRank} bei {earnedAp} AP. Fähigkeiten werden durch reguläre Talentwahlen erworben.</p>
              <div className="grid gap-[8px] md:grid-cols-2">
                {prestige.abilities.map((ability) => {
                  const unlocked = ability.ap <= earnedAp;
                  return (
                    <label key={ability.id} className={`flex gap-[8px] rounded border border-current/15 p-[8px] text-sm ${unlocked ? "" : "opacity-50"}`}>
                      <input type="checkbox" name="prestigeAbility" value={ability.id} disabled={!unlocked} defaultChecked={saved.prestigeAbilities.includes(ability.id)} />
                      <span><strong>Rang {ability.rank} · {ability.name} (ab {ability.ap} AP)</strong>{ability.requirements && <span className="block text-xs opacity-70">Voraussetzung: {ability.requirements}</span>}<span className="block mt-[3px]">{ability.description}</span></span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
      <SubmitButton pending={pending} pendingLabel="Speichert…" className="lcars-pill-btn--outline self-start">Modulwerte speichern</SubmitButton>
    </form>
  );
}

export default function RuleModuleCharacterSections({
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
}) {
  return modules.map((definition) => {
    const saved = stats.ruleModules[definition.id] ?? {
      resources: {}, selectedTalents: [], selectedStatuses: [], prestigeClass: null, prestigeAbilities: [],
    };
    const hasCharacterFields = definition.resources.length > 0 ||
      definition.statuses.length > 0 || definition.talents.length > 0 ||
      definition.prestigeClasses.length > 0 || definition.id === "technomage";
    return (
      <section key={definition.id} className="flex flex-col gap-[12px] rounded-[12px] border border-current/30 p-[12px]">
        <div>
          <p className="lcars-eyebrow">Regelmodul</p>
          <h2 className="text-lg font-bold">{definition.name}</h2>
          <p className="text-sm opacity-75">{definition.summary}</p>
        </div>
        {definition.id === "technomage" && (
          <TechnomageSpellsPanel userId={userId} characterId={characterId} stats={stats} earnedAp={earnedAp} moduleDefinition={definition} />
        )}
        {hasCharacterFields ? (
          <ModuleEditor key={`${definition.id}-${JSON.stringify(saved)}`} definition={definition} saved={saved} userId={userId} characterId={characterId} earnedAp={earnedAp} insight={stats.attributes.insight} />
        ) : (
          <p className="text-sm opacity-75">Dieses Modul ergänzt den Charakterbogen um Regeln, aber keine eigenen Modulwerte.</p>
        )}
        <details>
          <summary className="cursor-pointer font-bold">Regeln des Moduls ({definition.rules.length})</summary>
          <div className="mt-[8px] flex flex-col gap-[10px]">
            {definition.rules.map((rule) => <article key={rule.id}><h3 className="font-bold">{rule.title}</h3><p className="text-sm">{rule.body}</p></article>)}
          </div>
        </details>
      </section>
    );
  });
}
