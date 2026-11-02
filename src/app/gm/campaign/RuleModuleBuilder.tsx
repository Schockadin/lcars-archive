"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import type {
  RuleModulePrestigeAbility,
  RuleModulePrestigeClass,
  RuleModuleResource,
  RuleModuleRule,
  RuleModuleStatus,
  RuleModuleTalent,
} from "@/lib/ruleModuleTypes";
import {
  TECHNOMAGE_SCHOOLS,
  type TechnomageEffect,
  type TechnomageSpell,
} from "@/lib/technomageSpellCatalog";
type CollectionKey =
  | "rules"
  | "resources"
  | "statuses"
  | "talents"
  | "prestigeClasses"
  | "schools"
  | "spells";
type CollectionItem<K extends CollectionKey> = RuleModuleDefinition[K][number];

function replaceCollection<K extends CollectionKey>(
  definition: RuleModuleDefinition,
  onChange: (definition: RuleModuleDefinition) => void,
  key: K,
  change: (items: CollectionItem<K>[]) => CollectionItem<K>[],
) {
  const items = definition[key] as CollectionItem<K>[];
  onChange({
    ...definition,
    [key]: change(items),
  } as RuleModuleDefinition);
}

function nextEntryId(ids: string[], prefix: string): string {
  let index = 1;
  while (ids.includes(prefix + "-" + index)) index += 1;
  return prefix + "-" + index;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={"flex min-w-0 flex-col gap-[4px] text-sm " + className}>
      <span className="font-bold">{label}</span>
      {children}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <input
        className="lcars-input w-full"
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        maxLength={maxLength}
      />
    </Field>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        className="lcars-input w-full"
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  minimum,
  maximum,
  nullable = false,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  minimum?: number;
  maximum?: number;
  nullable?: boolean;
  step?: number | "any";
}) {
  return (
    <Field label={label}>
      <input
        className="lcars-input w-full"
        type="number"
        value={value ?? ""}
        min={minimum}
        max={maximum}
        step={step}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          onChange(raw === "" && nullable ? null : Number(raw));
        }}
      />
    </Field>
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
    <Field label={label}>
      <select
        className="lcars-input w-full"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-[8px] text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {label}
    </label>
  );
}

function BuilderSection({
  title,
  count,
  children,
  addLabel,
  onAdd,
  addDisabled = false,
}: {
  title: string;
  count: number;
  children: ReactNode;
  addLabel: string;
  onAdd: () => void;
  addDisabled?: boolean;
}) {
  return (
    <details className="rounded-[10px] border border-current/20 p-[10px]">
      <summary className="cursor-pointer font-bold">
        {title} ({count})
      </summary>
      <div className="mt-[10px] flex flex-col gap-[10px]">
        {children}
        <button
          type="button"
          className="lcars-pill-btn--outline self-start"
          onClick={onAdd}
          disabled={addDisabled}
        >
          + {addLabel}
        </button>
      </div>
    </details>
  );
}

function EntryCard({
  title,
  id,
  children,
  onRemove,
  removeDisabled = false,
}: {
  title: string;
  id: string;
  children: ReactNode;
  onRemove: () => void;
  removeDisabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <details
      className="rounded-[8px] border border-current/15 p-[10px]"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer">
        <strong>{title || "Unbenannter Baustein"}</strong>{" "}
        <span className="text-xs opacity-70">({id || "ohne ID"})</span>
      </summary>
      {expanded && (
        <div className="mt-[10px] flex flex-col gap-[10px]">
          {children}
          <button
            type="button"
            className="lcars-pill-btn--outline self-start"
            onClick={onRemove}
            disabled={removeDisabled}
          >
            {title || "Baustein"} entfernen
          </button>
        </div>
      )}
    </details>
  );
}

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

const SCHOOL_OPTIONS = TECHNOMAGE_SCHOOLS.map((school) => ({
  value: school.id,
  label: school.label + " (" + school.original + ")",
}));

export default function RuleModuleBuilder({
  definition,
  onChange,
}: {
  definition: RuleModuleDefinition;
  onChange: (definition: RuleModuleDefinition) => void;
}) {
  const [spellSearch, setSpellSearch] = useState("");
  const setCollection = <K extends CollectionKey>(
    key: K,
    change: (items: CollectionItem<K>[]) => CollectionItem<K>[],
  ) => replaceCollection(definition, onChange, key, change);

  const patchItem = <K extends CollectionKey>(
    key: K,
    index: number,
    patch: Partial<CollectionItem<K>>,
  ) => {
    setCollection(key, (items) =>
      items.map((item, currentIndex) =>
        currentIndex === index
          ? ({ ...item, ...patch } as CollectionItem<K>)
          : item,
      ),
    );
  };

  const removeItem = <K extends CollectionKey>(key: K, index: number) => {
    setCollection(key, (items) => items.filter((_, i) => i !== index));
  };

  const patchAbility = (
    prestigeIndex: number,
    abilityIndex: number,
    patch: Partial<RuleModulePrestigeAbility>,
  ) => {
    setCollection("prestigeClasses", (items) =>
      items.map((item, index) =>
        index === prestigeIndex
          ? {
              ...item,
              abilities: item.abilities.map((ability, currentIndex) =>
                currentIndex === abilityIndex ? { ...ability, ...patch } : ability,
              ),
            }
          : item,
      ),
    );
  };

  const removeAbility = (prestigeIndex: number, abilityIndex: number) => {
    setCollection("prestigeClasses", (items) =>
      items.map((item, index) =>
        index === prestigeIndex
          ? {
              ...item,
              abilities: item.abilities.filter(
                (_, currentIndex) => currentIndex !== abilityIndex,
              ),
            }
          : item,
      ),
    );
  };

  const addRule = () => {
    const item: RuleModuleRule = {
      id: nextEntryId(definition.rules.map((rule) => rule.id), "regel"),
      title: "Neue Regel",
      body: "",
    };
    setCollection("rules", (items) => [...items, item]);
  };
  const addResource = () => {
    const item: RuleModuleResource = {
      id: nextEntryId(definition.resources.map((resource) => resource.id), "ressource"),
      name: "Neue Ressource",
      abbreviation: "",
      maximum: "",
    };
    setCollection("resources", (items) => [...items, item]);
  };
  const addStatus = () => {
    const item: RuleModuleStatus = {
      id: nextEntryId(definition.statuses.map((status) => status.id), "status"),
      label: "Neuer Status",
    };
    setCollection("statuses", (items) => [...items, item]);
  };
  const addTalent = () => {
    const item: RuleModuleTalent = {
      id: nextEntryId(definition.talents.map((talent) => talent.id), "talent"),
      name: "Neues Talent",
      category: "",
      requirements: "",
      description: "",
      repeatable: false,
    };
    setCollection("talents", (items) => [...items, item]);
  };
  const addPrestigeClass = () => {
    const item: RuleModulePrestigeClass = {
      id: nextEntryId(
        definition.prestigeClasses.map((prestige) => prestige.id),
        "prestige-pfad",
      ),
      name: "Neuer Prestige-Pfad",
      description: "",
      requirements: "",
      abilities: [],
    };
    setCollection("prestigeClasses", (items) => [...items, item]);
  };
  const addSchool = () => {
    const school = TECHNOMAGE_SCHOOLS.find(
      (candidate) =>
        !definition.schools.some((entry) => entry.id === candidate.id),
    );
    if (!school) return;
    setCollection("schools", (items) => [
      ...items,
      { ...school },
    ]);
  };
  const addSpell = () => {
    const school = definition.schools[0]?.id;
    if (!school) return;
    const item: TechnomageSpell = {
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
    };
    setCollection("spells", (items) => [...items, item]);
  };

  const usedSchoolIds = new Set(definition.schools.map((school) => school.id));
  const availableSchoolCount = TECHNOMAGE_SCHOOLS.filter(
    (school) => !usedSchoolIds.has(school.id),
  ).length;
  const visibleSpells = definition.spells
    .map((spell, index) => ({ spell, index }))
    .filter(({ spell }) => {
      const query = spellSearch.trim().toLocaleLowerCase();
      const school = definition.schools.find((entry) => entry.id === spell.school);
      return !query ||
        spell.name.toLocaleLowerCase().includes(query) ||
        spell.id.toLocaleLowerCase().includes(query) ||
        (school?.label.toLocaleLowerCase().includes(query) ?? false) ||
        (school?.original.toLocaleLowerCase().includes(query) ?? false);
    });

  return (
    <div className="flex flex-col gap-[12px]">
      <section className="grid gap-[10px] rounded-[10px] border border-current/20 p-[10px] sm:grid-cols-2">
        <TextField
          label="Modulname"
          value={definition.name}
          onChange={(name) => onChange({ ...definition, name })}
          required
          maxLength={200}
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label="Kurzbeschreibung"
            value={definition.summary}
            onChange={(summary) => onChange({ ...definition, summary })}
            rows={2}
            maxLength={2000}
          />
        </div>
        <TextField
          label="Charakterrollen, kommasepariert (* für alle)"
          value={definition.characterRoles.join(", ")}
          onChange={(value) =>
            onChange({
              ...definition,
              characterRoles: value
                .split(",")
                .map((role) => role.trim())
                .filter(Boolean),
            })
          }
          required
          maxLength={1000}
        />
        <div className="flex flex-col justify-end gap-[4px] text-sm">
          <span className="font-bold">Feste Modul-ID</span>
          <code className="rounded border border-current/15 px-[8px] py-[6px]">
            {definition.id}
          </code>
        </div>
        <p className="text-xs text-lcars-ink-dim sm:col-span-2">
          Baustein-IDs müssen innerhalb ihrer Kategorie eindeutig sein und mit
          einem Buchstaben oder einer Ziffer beginnen; erlaubt sind Buchstaben,
          Ziffern und Bindestriche (maximal 80 Zeichen).
        </p>
      </section>

      <BuilderSection
        title="Regeln"
        count={definition.rules.length}
        addLabel="Regel hinzufügen"
        onAdd={addRule}
        addDisabled={definition.rules.length >= 100}
      >
        {definition.rules.map((rule, index) => (
          <EntryCard
            key={rule.id + "-" + index}
            title={rule.title}
            id={rule.id}
            onRemove={() => removeItem("rules", index)}
          >
            <TextField
              label="ID"
              value={rule.id}
              onChange={(id) => patchItem("rules", index, { id })}
            />
            <TextField
              label="Titel"
              value={rule.title}
              onChange={(title) => patchItem("rules", index, { title })}
            />
            <TextAreaField
              label="Regeltext"
              value={rule.body}
              onChange={(body) => patchItem("rules", index, { body })}
            />
          </EntryCard>
        ))}
      </BuilderSection>

      <BuilderSection
        title="Ressourcen"
        count={definition.resources.length}
        addLabel="Ressource hinzufügen"
        onAdd={addResource}
        addDisabled={definition.resources.length >= 100}
      >
        {definition.resources.map((resource, index) => (
          <EntryCard
            key={resource.id + "-" + index}
            title={resource.name}
            id={resource.id}
            onRemove={() => removeItem("resources", index)}
          >
            <div className="grid gap-[10px] sm:grid-cols-2">
              <TextField label="ID" value={resource.id} onChange={(id) => patchItem("resources", index, { id })} />
              <TextField label="Name" value={resource.name} onChange={(name) => patchItem("resources", index, { name })} />
              <TextField label="Abkürzung" value={resource.abbreviation} onChange={(abbreviation) => patchItem("resources", index, { abbreviation })} />
              <TextField label="Maximum / Regelhinweis" value={resource.maximum} onChange={(maximum) => patchItem("resources", index, { maximum })} />
            </div>
          </EntryCard>
        ))}
      </BuilderSection>

      <BuilderSection
        title="Status"
        count={definition.statuses.length}
        addLabel="Status hinzufügen"
        onAdd={addStatus}
        addDisabled={definition.statuses.length >= 100}
      >
        {definition.statuses.map((status, index) => (
          <EntryCard
            key={status.id + "-" + index}
            title={status.label}
            id={status.id}
            onRemove={() => removeItem("statuses", index)}
          >
            <TextField label="ID" value={status.id} onChange={(id) => patchItem("statuses", index, { id })} />
            <TextField label="Anzeigename" value={status.label} onChange={(label) => patchItem("statuses", index, { label })} />
          </EntryCard>
        ))}
      </BuilderSection>

      <BuilderSection
        title="Talente"
        count={definition.talents.length}
        addLabel="Talent hinzufügen"
        onAdd={addTalent}
        addDisabled={definition.talents.length >= 500}
      >
        {definition.talents.map((talent, index) => (
          <EntryCard
            key={talent.id + "-" + index}
            title={talent.name}
            id={talent.id}
            onRemove={() => removeItem("talents", index)}
          >
            <div className="grid gap-[10px] sm:grid-cols-2">
              <TextField label="ID" value={talent.id} onChange={(id) => patchItem("talents", index, { id })} />
              <TextField label="Name" value={talent.name} onChange={(name) => patchItem("talents", index, { name })} />
              <TextField label="Kategorie" value={talent.category} onChange={(category) => patchItem("talents", index, { category })} />
              <TextField label="Voraussetzungen" value={talent.requirements} onChange={(requirements) => patchItem("talents", index, { requirements })} />
              <div className="sm:col-span-2">
                <TextAreaField label="Beschreibung" value={talent.description} onChange={(description) => patchItem("talents", index, { description })} />
              </div>
              <CheckField
                label="Wiederholbar"
                checked={talent.repeatable ?? false}
                onChange={(repeatable) => patchItem("talents", index, { repeatable })}
              />
            </div>
          </EntryCard>
        ))}
      </BuilderSection>

      <BuilderSection
        title="Prestige-Pfade"
        count={definition.prestigeClasses.length}
        addLabel="Prestige-Pfad hinzufügen"
        onAdd={addPrestigeClass}
        addDisabled={definition.prestigeClasses.length >= 100}
      >
        {definition.prestigeClasses.map((prestige, prestigeIndex) => (
          <EntryCard
            key={prestige.id + "-" + prestigeIndex}
            title={prestige.name}
            id={prestige.id}
            onRemove={() => removeItem("prestigeClasses", prestigeIndex)}
          >
            <TextField label="ID" value={prestige.id} onChange={(id) => patchItem("prestigeClasses", prestigeIndex, { id })} />
            <TextField label="Name" value={prestige.name} onChange={(name) => patchItem("prestigeClasses", prestigeIndex, { name })} />
            <TextAreaField label="Beschreibung" value={prestige.description} onChange={(description) => patchItem("prestigeClasses", prestigeIndex, { description })} />
            <TextAreaField label="Aufnahmebedingungen" value={prestige.requirements} onChange={(requirements) => patchItem("prestigeClasses", prestigeIndex, { requirements })} rows={2} />
            <details className="rounded-[8px] border border-current/15 p-[10px]">
              <summary className="cursor-pointer font-bold">
                Fähigkeiten ({prestige.abilities.length})
              </summary>
              <div className="mt-[10px] flex flex-col gap-[10px]">
                {prestige.abilities.map((ability, abilityIndex) => (
                  <EntryCard
                    key={ability.id + "-" + abilityIndex}
                    title={ability.name}
                    id={ability.id}
                    onRemove={() => removeAbility(prestigeIndex, abilityIndex)}
                  >
                    <div className="grid gap-[10px] sm:grid-cols-2">
                      <TextField
                        label="ID"
                        value={ability.id}
                        onChange={(id) => patchAbility(prestigeIndex, abilityIndex, { id })}
                      />
                      <TextField
                        label="Name"
                        value={ability.name}
                        onChange={(name) => patchAbility(prestigeIndex, abilityIndex, { name })}
                      />
                      <TextField
                        label="Kategorie"
                        value={ability.category}
                        onChange={(category) => patchAbility(prestigeIndex, abilityIndex, { category })}
                      />
                      <TextField
                        label="Voraussetzungen"
                        value={ability.requirements}
                        onChange={(requirements) => patchAbility(prestigeIndex, abilityIndex, { requirements })}
                      />
                      <NumberField
                        label="Rang (1–10)"
                        value={ability.rank}
                        minimum={1}
                        maximum={10}
                        onChange={(rank) => patchAbility(prestigeIndex, abilityIndex, { rank: rank ?? 1 })}
                      />
                      <NumberField
                        label="Freischaltung ab AP"
                        value={ability.ap}
                        minimum={0}
                        onChange={(ap) => patchAbility(prestigeIndex, abilityIndex, { ap: ap ?? 0 })}
                      />
                      <div className="sm:col-span-2">
                        <TextAreaField
                          label="Beschreibung"
                          value={ability.description}
                          onChange={(description) =>
                            patchAbility(prestigeIndex, abilityIndex, { description })
                          }
                        />
                      </div>
                    </div>
                  </EntryCard>
                ))}
                <button
                  type="button"
                  className="lcars-pill-btn--outline self-start"
                  disabled={prestige.abilities.length >= 20}
                  onClick={() => {
                    const ability: RuleModulePrestigeAbility = {
                      id: nextEntryId(
                        prestige.abilities.map((entry) => entry.id),
                        "faehigkeit",
                      ),
                      name: "Neue Fähigkeit",
                      category: "Prestige",
                      requirements: "",
                      description: "",
                      rank: 1,
                      ap: 0,
                    };
                    setCollection("prestigeClasses", (items) =>
                      items.map((item, index) =>
                        index === prestigeIndex
                          ? { ...item, abilities: [...item.abilities, ability] }
                          : item,
                      ),
                    );
                  }}
                >
                  + Fähigkeit hinzufügen
                </button>
              </div>
            </details>
          </EntryCard>
        ))}
      </BuilderSection>

      {definition.id === "technomage" && (
        <>
          <BuilderSection
            title="Technomage-Schulen"
            count={definition.schools.length}
            addLabel="Schule hinzufügen"
            onAdd={addSchool}
            addDisabled={
              definition.schools.length >= 30 || availableSchoolCount === 0
            }
          >
            {definition.schools.map((school, index) => (
              <EntryCard
                key={school.id + "-" + index}
                title={school.label}
                id={school.id}
                removeDisabled={definition.spells.some(
                  (spell) => spell.school === school.id,
                ) || definition.schools.length <= 1}
                onRemove={() => removeItem("schools", index)}
              >
                <SelectField
                  label="Schul-ID"
                  value={school.id}
                  options={SCHOOL_OPTIONS.filter(
                    (option) =>
                      option.value === school.id ||
                      !usedSchoolIds.has(option.value),
                  )}
                  onChange={(id) => {
                    onChange({
                      ...definition,
                      schools: definition.schools.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, id } : item,
                      ),
                      spells: definition.spells.map((spell) =>
                        spell.school === school.id ? { ...spell, school: id } : spell,
                      ),
                    });
                  }}
                />
                <TextField
                  label="Anzeigename"
                  value={school.label}
                  onChange={(label) =>
                    setCollection("schools", (items) =>
                      items.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, label } : item,
                      ),
                    )
                  }
                />
                <TextField
                  label="Originalname"
                  value={school.original}
                  onChange={(original) =>
                    setCollection("schools", (items) =>
                      items.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, original } : item,
                      ),
                    )
                  }
                />
                {definition.spells.some((spell) => spell.school === school.id) && (
                  <p className="text-xs text-lcars-ink-dim">
                    Diese Schule wird noch von Spells verwendet. Entferne zuerst
                    die zugehörigen Spells.
                  </p>
                )}
              </EntryCard>
            ))}
            {definition.schools.length <= 1 && (
              <p className="text-xs text-lcars-ink-dim">
                Ein Technomage-Modul benötigt mindestens eine Schule.
              </p>
            )}
          </BuilderSection>

          <BuilderSection
            title="Technomage-Spells"
            count={definition.spells.length}
            addLabel="Spell hinzufügen"
            onAdd={addSpell}
            addDisabled={
              definition.spells.length >= 2000 || definition.schools.length === 0
            }
          >
            {definition.schools.length === 0 && (
              <p className="text-sm text-lcars-ink-dim">
                Lege zuerst mindestens eine Schule an, damit Spells zugeordnet
                werden können.
              </p>
            )}
            <TextField
              label="Spells nach Name, ID oder Schule filtern"
              value={spellSearch}
              onChange={setSpellSearch}
            />
            {visibleSpells.length < definition.spells.length && (
              <p className="text-xs text-lcars-ink-dim">
                {visibleSpells.length} von {definition.spells.length} Spells
              </p>
            )}
            {visibleSpells.map(({ spell, index }) => (
              <EntryCard
                key={spell.id + "-" + index}
                title={spell.name}
                id={spell.id}
                onRemove={() => removeItem("spells", index)}
              >
                <div className="grid gap-[10px] sm:grid-cols-2">
                  <TextField label="ID" value={spell.id} onChange={(id) => patchItem("spells", index, { id })} />
                  <TextField label="Spell-Name" value={spell.name} onChange={(name) => patchItem("spells", index, { name })} required />
                  <SelectField
                    label="Schule"
                    value={spell.school}
                    options={definition.schools.map((school) => ({
                      value: school.id,
                      label: school.label,
                    }))}
                    onChange={(school) => patchItem("spells", index, { school })}
                  />
                  <SelectField
                    label="Wirkungsart"
                    value={spell.effect}
                    options={EFFECT_OPTIONS}
                    onChange={(effect) => patchItem("spells", index, { effect })}
                  />
                  <TextField label="Voraussetzungen" value={spell.requirements} onChange={(requirements) => patchItem("spells", index, { requirements })} />
                  <NumberField
                    label="Magery-Schwierigkeit (optional)"
                    value={spell.sourceMageryDc}
                    onChange={(sourceMageryDc) => patchItem("spells", index, { sourceMageryDc })}
                    nullable
                    step="any"
                  />
                  <TextField
                    label="Casting Time"
                    value={spell.sourceCastingTime ?? ""}
                    onChange={(sourceCastingTime) => patchItem("spells", index, { sourceCastingTime: sourceCastingTime || null })}
                  />
                  <TextField
                    label="Casting Cost"
                    value={spell.sourceCastingCost ?? ""}
                    onChange={(sourceCastingCost) => patchItem("spells", index, { sourceCastingCost: sourceCastingCost || null })}
                  />
                  <TextField
                    label="Maintenance Cost"
                    value={spell.sourceMaintenanceCost ?? ""}
                    onChange={(sourceMaintenanceCost) => patchItem("spells", index, { sourceMaintenanceCost: sourceMaintenanceCost || null })}
                  />
                  <TextField label="Reichweite" value={spell.sourceRange ?? ""} onChange={(sourceRange) => patchItem("spells", index, { sourceRange: sourceRange || null })} />
                  <TextField label="Ziel" value={spell.sourceTarget ?? ""} onChange={(sourceTarget) => patchItem("spells", index, { sourceTarget: sourceTarget || null })} />
                  <TextField label="Dauer" value={spell.sourceDuration ?? ""} onChange={(sourceDuration) => patchItem("spells", index, { sourceDuration: sourceDuration || null })} />
                  <TextField label="Element-Kategorie" value={spell.elementalCategory ?? ""} onChange={(elementalCategory) => patchItem("spells", index, { elementalCategory: elementalCategory || null })} />
                  <NumberField
                    label="Fact-Book-Seite"
                    value={spell.sourcePage}
                    minimum={1}
                    onChange={(sourcePage) => patchItem("spells", index, { sourcePage: sourcePage ?? 1 })}
                  />
                </div>
              </EntryCard>
            ))}
          </BuilderSection>
        </>
      )}
    </div>
  );
}
