"use client";

import { useState } from "react";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import {
  TECHNOMAGE_SCHOOLS,
  type TechnomageEffect,
  type TechnomageSpell,
} from "@/lib/technomageSpellCatalog";

const EFFECT_OPTIONS: { value: TechnomageEffect; label: string }[] = [
  { value: "attack", label: "Angriff" },
  { value: "concealment", label: "Tarnung" },
  { value: "crafting", label: "Herstellung" },
  { value: "creation", label: "Erschaffung" },
  { value: "defence", label: "Abwehr" },
  { value: "enhancement", label: "Verstärkung" },
  { value: "healing", label: "Heilung" },
  { value: "illusion", label: "Illusion" },
  { value: "manipulation", label: "Manipulation" },
  { value: "movement", label: "Bewegung" },
  { value: "perception", label: "Wahrnehmung" },
  { value: "protection", label: "Schutz" },
  { value: "summoning", label: "Beschwörung" },
  { value: "utility", label: "Hilfszauber" },
];

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[4px] text-sm">
      <span className="font-bold">{label}</span>
      <input
        className="lcars-input w-full"
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[4px] text-sm">
      <span className="font-bold">{label}</span>
      <select
        className="lcars-input w-full"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function nextEntryId(ids: string[], prefix: string): string {
  let index = 1;
  while (ids.includes(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

export default function TechnomageRuleModuleBuilder({
  definition,
  onChange,
}: {
  definition: RuleModuleDefinition;
  onChange: (definition: RuleModuleDefinition) => void;
}) {
  const [spellSearch, setSpellSearch] = useState("");
  const setSchools = (schools: RuleModuleDefinition["schools"]) => onChange({ ...definition, schools });
  const setSpells = (spells: TechnomageSpell[]) => onChange({ ...definition, spells });
  const addSchool = () => {
    const school = TECHNOMAGE_SCHOOLS.find((candidate) =>
      !definition.schools.some((entry) => entry.id === candidate.id),
    );
    if (school) setSchools([...definition.schools, { ...school }]);
  };
  const addSpell = () => {
    const school = definition.schools[0]?.id;
    if (!school) return;
    setSpells([...definition.spells, {
      id: nextEntryId(definition.spells.map((spell) => spell.id), "spell"),
      name: "Neuer Spell",
      school,
      requirements: "",
      sourceCastingTime: null,
      sourceMageryDc: null,
      sourceCastingCost: null,
      sourceMaintenanceCost: null,
      sourceRange: null,
      sourceTarget: null,
      sourceDuration: null,
      elementalCategory: null,
      sourcePage: 1,
      effect: "utility",
    }]);
  };
  const patchSpell = (index: number, patch: Partial<TechnomageSpell>) => {
    setSpells(definition.spells.map((spell, currentIndex) =>
      currentIndex === index ? { ...spell, ...patch } : spell,
    ));
  };
  const visibleSpells = definition.spells
    .map((spell, index) => ({ spell, index }))
    .filter(({ spell }) => {
      const query = spellSearch.trim().toLocaleLowerCase();
      const school = definition.schools.find((entry) => entry.id === spell.school);
      return !query || spell.name.toLocaleLowerCase().includes(query) ||
        spell.id.toLocaleLowerCase().includes(query) ||
        (school?.label.toLocaleLowerCase().includes(query) ?? false) ||
        (school?.original.toLocaleLowerCase().includes(query) ?? false);
    });

  return (
    <div className="flex flex-col gap-[12px]">
      <details className="rounded-[10px] border border-current/20 p-[10px]">
        <summary className="cursor-pointer font-bold">Technomage-Schulen ({definition.schools.length})</summary>
        <div className="mt-[10px] flex flex-col gap-[10px]">
          {definition.schools.map((school, index) => {
            const usedSchoolIds = new Set(definition.schools.map((entry) => entry.id));
            const inUse = definition.spells.some((spell) => spell.school === school.id);
            return (
              <details key={`${school.id}-${index}`} className="rounded border border-current/15 p-[8px]">
                <summary className="cursor-pointer">{school.label} <span className="text-xs opacity-70">({school.id})</span></summary>
                <div className="mt-[8px] grid gap-[8px] sm:grid-cols-2">
                  <SelectField
                    label="Schul-ID"
                    value={school.id}
                    options={TECHNOMAGE_SCHOOLS.filter((option) => option.id === school.id || !usedSchoolIds.has(option.id)).map((option) => ({ value: option.id, label: `${option.label} (${option.original})` }))}
                    onChange={(id) => onChange({
                      ...definition,
                      schools: definition.schools.map((entry, currentIndex) => currentIndex === index ? { ...entry, id } : entry),
                      spells: definition.spells.map((spell) => spell.school === school.id ? { ...spell, school: id } : spell),
                    })}
                  />
                  <TextField label="Anzeigename" value={school.label} onChange={(label) => setSchools(definition.schools.map((entry, currentIndex) => currentIndex === index ? { ...entry, label } : entry))} />
                  <TextField label="Originalname" value={school.original} onChange={(original) => setSchools(definition.schools.map((entry, currentIndex) => currentIndex === index ? { ...entry, original } : entry))} />
                  <button
                    type="button"
                    className="lcars-pill-btn--outline self-end justify-self-start"
                    disabled={inUse || definition.schools.length <= 1}
                    onClick={() => setSchools(definition.schools.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    Schule entfernen
                  </button>
                  {inUse && <p className="text-xs opacity-70">Diese Schule wird noch von Spells verwendet.</p>}
                </div>
              </details>
            );
          })}
          <button type="button" className="lcars-pill-btn--outline self-start" disabled={definition.schools.length >= 30 || definition.schools.length >= TECHNOMAGE_SCHOOLS.length} onClick={addSchool}>
            + Schule hinzufügen
          </button>
        </div>
      </details>

      <details className="rounded-[10px] border border-current/20 p-[10px]">
        <summary className="cursor-pointer font-bold">Technomage-Spells ({definition.spells.length})</summary>
        <div className="mt-[10px] flex flex-col gap-[10px]">
          <p className="text-sm opacity-75">Spell-Daten der Technomage-Erweiterung. Andere Regelmodule erstellen vergleichbare Listen unter „Eigene Inhaltsbereiche“.</p>
          <TextField label="Spells nach Name, ID oder Schule filtern" value={spellSearch} onChange={setSpellSearch} />
          {visibleSpells.length < definition.spells.length && <p className="text-xs opacity-70">{visibleSpells.length} von {definition.spells.length} Spells</p>}
          {visibleSpells.map(({ spell, index }) => (
            <details key={`${spell.id}-${index}`} className="rounded border border-current/15 p-[8px]">
              <summary className="cursor-pointer">{spell.name} <span className="text-xs opacity-70">({spell.id})</span></summary>
              <div className="mt-[8px] grid gap-[8px] sm:grid-cols-2">
                <TextField label="ID" value={spell.id} onChange={(id) => patchSpell(index, { id })} />
                <TextField label="Spell-Name" value={spell.name} onChange={(name) => patchSpell(index, { name })} />
                <SelectField label="Schule" value={spell.school} options={definition.schools.map((school) => ({ value: school.id, label: school.label }))} onChange={(school) => patchSpell(index, { school })} />
                <SelectField label="Wirkungsart" value={spell.effect} options={EFFECT_OPTIONS} onChange={(effect) => patchSpell(index, { effect })} />
                <TextField label="Voraussetzungen" value={spell.requirements} onChange={(requirements) => patchSpell(index, { requirements })} />
                <TextField label="Magery-Schwierigkeit (optional)" type="number" value={spell.sourceMageryDc === null ? "" : String(spell.sourceMageryDc)} onChange={(value) => patchSpell(index, { sourceMageryDc: value.trim() === "" ? null : Number(value) })} />
                <TextField label="Casting Time" value={spell.sourceCastingTime ?? ""} onChange={(value) => patchSpell(index, { sourceCastingTime: value || null })} />
                <TextField label="Casting Cost" value={spell.sourceCastingCost ?? ""} onChange={(value) => patchSpell(index, { sourceCastingCost: value || null })} />
                <TextField label="Maintenance Cost" value={spell.sourceMaintenanceCost ?? ""} onChange={(value) => patchSpell(index, { sourceMaintenanceCost: value || null })} />
                <TextField label="Reichweite" value={spell.sourceRange ?? ""} onChange={(value) => patchSpell(index, { sourceRange: value || null })} />
                <TextField label="Ziel" value={spell.sourceTarget ?? ""} onChange={(value) => patchSpell(index, { sourceTarget: value || null })} />
                <TextField label="Dauer" value={spell.sourceDuration ?? ""} onChange={(value) => patchSpell(index, { sourceDuration: value || null })} />
                <TextField label="Element-Kategorie" value={spell.elementalCategory ?? ""} onChange={(value) => patchSpell(index, { elementalCategory: value || null })} />
                <TextField label="Fact-Book-Seite" type="number" value={String(spell.sourcePage)} onChange={(value) => patchSpell(index, { sourcePage: Number(value) })} />
                <button type="button" className="lcars-pill-btn--outline self-end justify-self-start" onClick={() => setSpells(definition.spells.filter((_, currentIndex) => currentIndex !== index))}>Spell entfernen</button>
              </div>
            </details>
          ))}
          <button type="button" className="lcars-pill-btn--outline self-start" disabled={definition.spells.length >= 2000 || definition.schools.length === 0} onClick={addSpell}>+ Spell hinzufügen</button>
        </div>
      </details>
    </div>
  );
}
