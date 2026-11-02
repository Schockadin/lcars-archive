"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import type {
  RuleModulePrestigeAbility,
  RuleModulePrestigeClass,
  RuleModuleCollection,
  RuleModuleCollectionEntry,
  RuleModuleCollectionField,
  RuleModuleCollectionFieldType,
  RuleModuleResource,
  RuleModuleRule,
  RuleModuleStatus,
  RuleModuleTalent,
} from "@/lib/ruleModuleTypes";
type CollectionKey =
  | "rules"
  | "resources"
  | "statuses"
  | "talents"
  | "prestigeClasses";
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

export default function RuleModuleBuilder({
  definition,
  onChange,
}: {
  definition: RuleModuleDefinition;
  onChange: (definition: RuleModuleDefinition) => void;
}) {
  const setCustomCollection = (
    index: number,
    change: (collection: RuleModuleCollection) => RuleModuleCollection,
  ) => onChange({
    ...definition,
    collections: definition.collections.map((collection, currentIndex) =>
      currentIndex === index ? change(collection) : collection,
    ),
  });
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
  const addCustomCollection = () => {
    const item: RuleModuleCollection = {
      id: nextEntryId(definition.collections.map((collection) => collection.id), "inhalt"),
      title: "Neuer Inhaltsbereich",
      description: "",
      fields: [],
      entries: [],
    };
    onChange({ ...definition, collections: [...definition.collections, item] });
  };
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

      <BuilderSection
        title="Eigene Inhaltsbereiche"
        count={definition.collections.length}
        addLabel="Inhaltsbereich hinzufügen"
        onAdd={addCustomCollection}
        addDisabled={definition.collections.length >= 100}
      >
        <p className="text-sm opacity-75">
          Erstelle eigene Listen, zum Beispiel für Kräfte, Ausrüstung, Formen,
          Fraktionsvorteile oder optionale Fähigkeiten. Charaktere können
          Einträge auswählen; die Werte bleiben beschreibende Modul-Daten.
        </p>
        {definition.collections.map((collection, collectionIndex) => (
          <EntryCard
            key={collection.id + "-" + collectionIndex}
            title={collection.title}
            id={collection.id}
            onRemove={() => onChange({
              ...definition,
              collections: definition.collections.filter((_, index) => index !== collectionIndex),
            })}
          >
            <div className="grid gap-[10px] sm:grid-cols-2">
              <TextField
                label="ID"
                value={collection.id}
                onChange={(id) => setCustomCollection(collectionIndex, (item) => ({ ...item, id }))}
                required
                maxLength={80}
              />
              <TextField
                label="Titel"
                value={collection.title}
                onChange={(title) => setCustomCollection(collectionIndex, (item) => ({ ...item, title }))}
                required
                maxLength={120}
              />
              <div className="sm:col-span-2">
                <TextAreaField
                  label="Hinweis für die Spielenden"
                  value={collection.description}
                  onChange={(description) => setCustomCollection(collectionIndex, (item) => ({ ...item, description }))}
                  rows={2}
                  maxLength={2000}
                />
              </div>
            </div>

            <div className="rounded border border-current/15 p-[10px]">
              <div className="mb-[8px] flex flex-wrap items-center justify-between gap-[8px]">
                <h4 className="font-bold">Eintragsfelder ({collection.fields.length})</h4>
                <button
                  type="button"
                  className="lcars-pill-btn--outline"
                  disabled={collection.fields.length >= 30}
                  onClick={() => {
                    const field: RuleModuleCollectionField = {
                      id: nextEntryId(collection.fields.map((item) => item.id), "feld"),
                      label: "Neues Feld",
                      type: "text",
                      options: [],
                    };
                    setCustomCollection(collectionIndex, (item) => ({ ...item, fields: [...item.fields, field] }));
                  }}
                >
                  + Feld hinzufügen
                </button>
              </div>
              {collection.fields.map((field, fieldIndex) => (
                <div key={field.id + "-" + fieldIndex} className="mb-[8px] grid gap-[8px] rounded border border-current/10 p-[8px] sm:grid-cols-2">
                  <TextField
                    label="Feld-ID"
                    value={field.id}
                    onChange={(id) => setCustomCollection(collectionIndex, (item) => ({
                      ...item,
                      fields: item.fields.map((current, index) => index === fieldIndex ? { ...current, id } : current),
                      entries: item.entries.map((entry) => {
                        const values = { ...entry.values };
                        if (Object.prototype.hasOwnProperty.call(values, field.id)) {
                          values[id] = values[field.id];
                          delete values[field.id];
                        }
                        return { ...entry, values };
                      }),
                    }))}
                    required
                    maxLength={80}
                  />
                  <TextField
                    label="Feldname"
                    value={field.label}
                    onChange={(label) => setCustomCollection(collectionIndex, (item) => ({
                      ...item,
                      fields: item.fields.map((current, index) => index === fieldIndex ? { ...current, label } : current),
                    }))}
                    required
                    maxLength={120}
                  />
                  <SelectField<RuleModuleCollectionFieldType>
                    label="Feldtyp"
                    value={field.type}
                    options={[
                      { value: "text", label: "Text" },
                      { value: "number", label: "Zahl" },
                      { value: "checkbox", label: "Ja/Nein" },
                      { value: "select", label: "Auswahlliste" },
                    ]}
                    onChange={(type) => setCustomCollection(collectionIndex, (item) => ({
                      ...item,
                      fields: item.fields.map((current, index) => index === fieldIndex ? { ...current, type, options: type === "select" ? (current.options.length > 0 ? current.options : ["Option 1"]) : [] } : current),
                      entries: item.entries.map((entry) => ({
                        ...entry,
                        values: { ...entry.values, [field.id]: type === "number" ? 0 : type === "checkbox" ? false : type === "select" ? (field.options[0] ?? "Option 1") : "" },
                      })),
                    }))}
                  />
                  {field.type === "select" && (
                    <TextField
                      label="Optionen (mit Komma trennen)"
                      value={field.options.join(", ")}
                      onChange={(raw) => {
                        const options = raw.split(",").map((option) => option.trim()).filter(Boolean).slice(0, 50);
                        setCustomCollection(collectionIndex, (item) => ({
                          ...item,
                          fields: item.fields.map((current, index) => index === fieldIndex ? { ...current, options } : current),
                          entries: item.entries.map((entry) => ({
                            ...entry,
                            values: {
                              ...entry.values,
                              [field.id]: options.includes(String(entry.values[field.id] ?? "")) ? entry.values[field.id] : (options[0] ?? ""),
                            },
                          })),
                        }));
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="lcars-pill-btn--outline self-end justify-self-start"
                    onClick={() => setCustomCollection(collectionIndex, (item) => ({
                      ...item,
                      fields: item.fields.filter((_, index) => index !== fieldIndex),
                      entries: item.entries.map((entry) => {
                        const values = { ...entry.values };
                        delete values[field.id];
                        return { ...entry, values };
                      }),
                    }))}
                  >
                    Feld entfernen
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded border border-current/15 p-[10px]">
              <div className="mb-[8px] flex flex-wrap items-center justify-between gap-[8px]">
                <h4 className="font-bold">Einträge ({collection.entries.length})</h4>
                <button
                  type="button"
                  className="lcars-pill-btn--outline"
                  disabled={collection.entries.length >= 500}
                  onClick={() => {
                    const values: RuleModuleCollectionEntry["values"] = {};
                    for (const field of collection.fields) {
                      values[field.id] = field.type === "number" ? 0 : field.type === "checkbox" ? false : field.type === "select" ? (field.options[0] ?? "") : "";
                    }
                    const entry: RuleModuleCollectionEntry = {
                      id: nextEntryId(collection.entries.map((item) => item.id), "eintrag"),
                      name: "Neuer Eintrag",
                      values,
                    };
                    setCustomCollection(collectionIndex, (item) => ({ ...item, entries: [...item.entries, entry] }));
                  }}
                >
                  + Eintrag hinzufügen
                </button>
              </div>
              {collection.entries.map((entry, entryIndex) => (
                <EntryCard
                  key={entry.id + "-" + entryIndex}
                  title={entry.name}
                  id={entry.id}
                  onRemove={() => setCustomCollection(collectionIndex, (item) => ({
                    ...item,
                    entries: item.entries.filter((_, index) => index !== entryIndex),
                  }))}
                >
                  <TextField
                    label="Eintragsname"
                    value={entry.name}
                    onChange={(name) => setCustomCollection(collectionIndex, (item) => ({
                      ...item,
                      entries: item.entries.map((current, index) => index === entryIndex ? { ...current, name } : current),
                    }))}
                    required
                    maxLength={200}
                  />
                  <div className="grid gap-[8px] sm:grid-cols-2">
                    {collection.fields.map((field) => (
                      <Field key={field.id} label={field.label}>
                        {field.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            checked={entry.values[field.id] === true}
                            onChange={(event) => setCustomCollection(collectionIndex, (item) => ({
                              ...item,
                              entries: item.entries.map((current, index) => index === entryIndex ? { ...current, values: { ...current.values, [field.id]: event.currentTarget.checked } } : current),
                            }))}
                          />
                        ) : field.type === "select" ? (
                          <select
                            className="lcars-input w-full"
                            value={String(entry.values[field.id] ?? "")}
                            onChange={(event) => setCustomCollection(collectionIndex, (item) => ({
                              ...item,
                              entries: item.entries.map((current, index) => index === entryIndex ? { ...current, values: { ...current.values, [field.id]: event.currentTarget.value } } : current),
                            }))}
                          >
                            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input
                            className="lcars-input w-full"
                            type={field.type === "number" ? "number" : "text"}
                            value={String(entry.values[field.id] ?? (field.type === "number" ? 0 : ""))}
                            onChange={(event) => setCustomCollection(collectionIndex, (item) => ({
                              ...item,
                              entries: item.entries.map((current, index) => index === entryIndex ? { ...current, values: { ...current.values, [field.id]: field.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value } } : current),
                            }))}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </EntryCard>
              ))}
            </div>
          </EntryCard>
        ))}
      </BuilderSection>


    </div>
  );
}
