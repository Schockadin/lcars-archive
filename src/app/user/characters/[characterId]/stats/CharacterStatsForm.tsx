"use client";
import { useActionState, useMemo, useState } from "react";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import { MinusCircleIcon } from "@/lib/icons";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  ATTRIBUTE_RULE,
  DEPARTMENT_RULE,
  EXPERIENCE_OPTIONS,
  validateDistribution,
} from "@/lib/characterStats";
import {
  characterStatsAction,
  type CharacterStatsFormState,
} from "../../_shared/statsAction";
import type { Talent } from "@/lib/talentCatalog";
import { TalentModal } from "../../_shared/TalentPicker";
import EntryAddModal from "../../_shared/EntryAddModal";
import type { CharacterStats } from "@/types/characterStats";
import {
  ATTRIBUTE_BOXES,
  DEPARTMENT_BOXES,
  DETERMINATION_POINTS,
  HEAD_BOXES,
  LIST_BOXES,
  PHOTO_BOX,
  RESISTANCE_BOX,
  STRESS_POINTS,
  STRESS_VALUE_BOX,
  boxStyle,
  offsetStyle,
  pointStyle,
  type Box,
} from "./personnelFileLayout";

const initialState: CharacterStatsFormState = {};

// Zahlen-Eingaben werden als Strings gehalten (ein leeres Feld ist "nicht
// gepflegt", nicht 0) und nur zum Rechnen/Prüfen umgewandelt.
export type NumberInputs = Record<string, string>;

function toNumbers(
  fields: { key: string }[],
  inputs: NumberInputs,
): (number | null)[] {
  return fields.map((field) => {
    const raw = inputs[field.key]?.trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  });
}

// Die Listen des Bogens, die als gepflegte Liste geführt werden: Einträge als
// beschriebene Zeilen im Kasten, ein Plus öffnet das Hinzufügen-Fenster, je
// Zeile ein rotes Minus zum Entfernen.
//
// Spezies-Fähigkeit und Sonderregeln fehlen hier bewusst: dort stehen in der
// Runde ganze Regelsätze, keine Aufzählungen — sie bleiben Textfelder.
// Talente laufen über den Katalog und haben deshalb ein eigenes Fenster.
interface ManagedListSpec {
  singular: string;
  placeholder: string;
  // Freikontingent der Ersterschaffung, falls es eines gibt.
  free?: "values" | "focuses";
  // true = das Kontingent ist eine harte Grenze (Schwerpunkte kosten danach
  // AP). Bei den Werten ist es nur eine Orientierung: sie lassen sich später
  // nicht kaufen, ein hartes Limit würde eine Vergabe durch die Spielleitung
  // blockieren.
  enforceFree?: boolean;
}

const MANAGED_LISTS: Record<string, ManagedListSpec> = {
  values: {
    singular: "Wert",
    placeholder: "z.B. „Ich diene der Flotte, nicht dem Ruhm“",
    free: "values",
  },
  focuses: {
    singular: "Schwerpunkt",
    placeholder: "z.B. Warpfeldtheorie",
    free: "focuses",
    enforceFree: true,
  },
  pastimes: { singular: "Hobby", placeholder: "z.B. Jazz-Klarinette" },
  attacks: { singular: "Angriff", placeholder: "z.B. Phaser Typ 2 (Strahl)" },
  equipment: { singular: "Ausrüstung", placeholder: "z.B. Tricorder" },
};

// Ein Listenkasten des Bogens. Die Einträge stehen als Zeilen darin, wie mit
// der Hand eingetragen; erst beim Überfahren einer Zeile erscheint ihr Minus.
function SheetList({
  box,
  entries,
  onRemove,
  onAdd,
  addLabel,
  readOnly,
  disabled = false,
  count,
}: {
  box: Box;
  entries: string[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  addLabel: string;
  readOnly: boolean;
  disabled?: boolean;
  // Optionale Zählung „x / y" am unteren Kastenrand.
  count?: string;
}) {
  return (
    <>
      <div className="pf-list" style={boxStyle(box)}>
        {entries.map((entry, index) => (
          <div key={`${entry}-${index}`} className="pf-list-line">
            <span className="pf-list-text">{entry}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="pf-list-remove"
                aria-label={`${entry} entfernen`}
                title={`${entry} entfernen`}
              >
                <MinusCircleIcon />
              </button>
            )}
          </div>
        ))}
      </div>
      {count && (
        <span
          className="pf-list-count"
          style={offsetStyle(box, box.width - 24, box.height - 14)}
        >
          {count}
        </span>
      )}
      {!readOnly && (
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="pf-list-add"
          style={offsetStyle(box, box.width - 20, box.height - 20)}
          aria-label={addLabel}
          title={addLabel}
        >
          +
        </button>
      )}
    </>
  );
}

// Charakterbogen („Personnel File" nach STA 2e) als Faksimile: die
// Original-Grafik als SVG, darüber exakt positionierte Eingabefelder — Maße
// siehe personnelFileLayout.ts, Optik siehe personnel-file.css.
//
// Bewusst KEIN ContentEditor: der ist auf Markdown-Text + Entwurf +
// Autolinking zugeschnitten, was hier alles nicht zutrifft — die
// Action-Konventionen (useActionState, FormError als Toast) sind dieselben.
export default function CharacterStatsForm({
  userId,
  characterId,
  characterName,
  rank,
  portrait,
  stats,
  talents,
  species,
  creationFreeTalents,
  creationFreeValues,
  creationFreeFocuses,
  talentEntries,
  setTalentEntries,
  attributes,
  setAttributes,
  departments,
  setDepartments,
}: {
  userId: number;
  characterId: number;
  characterName: string;
  // Name und Rang gehören zur Akte und werden dort gepflegt — auf dem Bogen
  // stehen sie an ihrem Platz, aber schreibgeschützt.
  rank: string | null;
  // Portrait des Charakters (siehe OwnCharacterStats). Der Bogen der Vorlage
  // hat kein Bildfeld; das Hochladen steht deshalb unter dem Blatt.
  portrait: string | null;
  // Die LIVE mitgeführten Werte (siehe CharacterSheet): Grundlage der
  // Talent-Auswahl, die Voraussetzungen gegen die aktuellen Zahlen prüft. Für
  // alle Felder, die dieses Formular selbst hält (Freitexte, übrige Listen),
  // ist der Live-Stand identisch mit dem gespeicherten — nur Attribute,
  // Disziplinen und Talente liegen als State eine Ebene höher.
  stats: CharacterStats;
  // Talent-Katalog für die Auswahl (gepflegt unter /gm/talents).
  talents: Talent[];
  // Spezies der Akte — für Voraussetzungen wie „Vulcan".
  species: string | null;
  // Freikontingente der Ersterschaffung (aus dem AP-Regelwerk).
  creationFreeTalents: number;
  creationFreeValues: number;
  creationFreeFocuses: number;
  // Talent-Liste als State der Klammer-Komponente (CharacterSheet).
  talentEntries: string[];
  setTalentEntries: React.Dispatch<React.SetStateAction<string[]>>;
  // Attribute und Disziplinen liegen ebenfalls als State eine Ebene höher:
  // der AP-Bereich rechnet damit live mit, während hier getippt wird. Beide
  // Blöcke bleiben Strings — ein leeres Feld ist „nicht gepflegt", nicht 0.
  attributes: NumberInputs;
  setAttributes: React.Dispatch<React.SetStateAction<NumberInputs>>;
  departments: NumberInputs;
  setDepartments: React.Dispatch<React.SetStateAction<NumberInputs>>;
}) {
  const [state, formAction, pending] = useActionState(
    characterStatsAction,
    initialState,
  );

  // Die verwalteten Listen als ein State-Objekt — ein useState je Feld wären
  // fünf fast gleiche Zeilen.
  const [lists, setLists] = useState<Record<string, string[]>>(() =>
    listSnapshotOf(stats),
  );
  const [careerEvents, setCareerEvents] = useState<string[]>(
    stats.careerEvents,
  );
  const [determination, setDetermination] = useState(stats.determination ?? 0);
  const [stressBonus, setStressBonus] = useState(
    stats.stressBonus?.toString() ?? "",
  );
  // Welches Hinzufügen-Fenster gerade offen ist (Schlüssel der Liste bzw.
  // "talents"); null = keines.
  const [adding, setAdding] = useState<string | null>(null);

  // Liefert der Server neue Werte (nach dem Speichern oder einer Steigerung —
  // Schwerpunkte lassen sich mit AP kaufen), zieht der lokale State nach.
  // Anpassung während des Renders, siehe React-Doku „Adjusting state when a
  // prop changes"; ein setState im Effect-Body löste einen zusätzlichen
  // Render aus.
  const snapshot = JSON.stringify([listSnapshotOf(stats), stats.careerEvents]);
  const [previousSnapshot, setPreviousSnapshot] = useState(snapshot);
  if (snapshot !== previousSnapshot) {
    setPreviousSnapshot(snapshot);
    setLists(listSnapshotOf(stats));
    setCareerEvents(stats.careerEvents);
  }

  function updateList(key: string, update: (prev: string[]) => string[]) {
    setLists((prev) => ({ ...prev, [key]: update(prev[key] ?? []) }));
  }

  const attributeValues = toNumbers(ATTRIBUTE_FIELDS, attributes);
  const departmentValues = toNumbers(DEPARTMENT_FIELDS, departments);

  // Regelverstöße live markieren — verbindlich geprüft wird trotzdem in der
  // Server-Action (siehe statsAction.ts).
  const ruleErrors = useMemo(
    () => [
      ...validateDistribution(attributeValues, ATTRIBUTE_RULE, "Attribute"),
      ...validateDistribution(departmentValues, DEPARTMENT_RULE, "Disziplinen"),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abgeleitet aus den beiden Eingabe-Objekten
    [attributes, departments],
  );

  // Markiert die Kästen, die an einer Häufungsgrenze beteiligt sind (alle
  // Werte auf 12 bzw. 11), damit sichtbar wird, WO die Regel klemmt.
  function overfilled(
    values: (number | null)[],
    rule: typeof ATTRIBUTE_RULE,
  ): Set<number> {
    const over = new Set<number>();
    if (values.filter((v) => v === rule.max).length > rule.maxAtMax) {
      over.add(rule.max);
    }
    if (values.filter((v) => v === rule.max - 1).length > rule.maxAtSecond) {
      over.add(rule.max - 1);
    }
    return over;
  }

  const attributeOverfilled = overfilled(attributeValues, ATTRIBUTE_RULE);
  const departmentOverfilled = overfilled(departmentValues, DEPARTMENT_RULE);

  function outOfRange(raw: string, rule: typeof ATTRIBUTE_RULE): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const value = Number(trimmed);
    return !Number.isInteger(value) || value < rule.min || value > rule.max;
  }

  // Maximaler Stress = Fitness + Bonus aus Talenten (siehe computeStress).
  const fitness = attributes.fitness?.trim() ? Number(attributes.fitness) : null;
  const bonus = stressBonus.trim() ? Number(stressBonus) : 0;
  const maxStress =
    fitness !== null && Number.isInteger(fitness)
      ? fitness + (Number.isInteger(bonus) ? bonus : 0)
      : null;

  const locked = stats.creationLocked;
  const freeCounts = { values: creationFreeValues, focuses: creationFreeFocuses };

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="determination" value={determination} />
      <input type="hidden" name="talents" value={talentEntries.join("\n")} />
      <input type="hidden" name="careerEvents" value={careerEvents.join("\n")} />
      {Object.keys(MANAGED_LISTS).map((key) => (
        <input
          key={key}
          type="hidden"
          name={key}
          value={(lists[key] ?? []).join("\n")}
        />
      ))}

      <div className="pf-page">
        <div className="pf-sheet">
          {/* Der Bogen selbst als Grafik — reine Deko, alle Eingaben liegen
              darüber. Bewusst <img> statt inline-SVG: 400 KB Vektorgrafik
              würden sonst in jedem RSC-Payload mitfahren. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pf-art"
            src="/character-sheet/personnel-file.svg"
            alt=""
            width={816}
            height={1056}
          />

          <div className="pf-form-layer">
            {/* Der Bildkasten des Bogens. Hochgeladen wird unter dem Blatt
                (die Vorlage hat dort kein Bedienelement), hier steht nur das
                Portrait der Akte. */}
            {portrait && (
              // Bewusst <img> statt next/image: die Portraits liegen im
              // öffentlichen Asset-Bucket unter beliebigen Hosts, für die
              // next/image eine Domain-Freigabe bräuchte.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="pf-photo"
                style={boxStyle(PHOTO_BOX)}
                src={portrait}
                alt={`Portrait von ${characterName}`}
              />
            )}

            {/* ── Kopfbereich ─────────────────────────────────────── */}
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.name)}
              value={characterName}
              readOnly
              title="Name gehört zur Akte und wird über „Charakter bearbeiten“ gepflegt."
              aria-label="Name"
            />
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.pronouns)}
              name="pronouns"
              defaultValue={stats.pronouns ?? ""}
              aria-label="Pronomen"
            />
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.rank)}
              value={rank ?? ""}
              readOnly
              title="Rang gehört zur Akte und wird über „Charakter bearbeiten“ gepflegt."
              aria-label="Rang"
            />
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.assignment)}
              name="assignment"
              defaultValue={stats.assignment ?? ""}
              aria-label="Zuweisung"
            />
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.characterRole)}
              name="characterRole"
              defaultValue={stats.characterRole ?? ""}
              aria-label="Rolle"
            />
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.reputation)}
              name="reputation"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              defaultValue={stats.reputation ?? ""}
              aria-label="Ansehen"
            />
            <input
              className="pf-field"
              style={boxStyle(HEAD_BOXES.traits)}
              name="traits"
              defaultValue={stats.traits ?? ""}
              aria-label="Spezies & Merkmale"
            />
            <textarea
              className="pf-field"
              style={boxStyle(HEAD_BOXES.environment)}
              name="environment"
              defaultValue={stats.environment ?? ""}
              aria-label="Herkunft"
            />
            <textarea
              className="pf-field"
              style={boxStyle(HEAD_BOXES.upbringing)}
              name="upbringing"
              defaultValue={stats.upbringing ?? ""}
              aria-label="Erziehung"
            />
            <textarea
              className="pf-field"
              style={boxStyle(HEAD_BOXES.careerPath)}
              name="careerPath"
              defaultValue={stats.careerPath ?? ""}
              aria-label="Laufbahn"
            />
            {/* Erfahrung ist im Datenmodell eine feste Stufe (Novice/
                Experienced/Veteran) — deshalb ein Auswahlfeld an der Stelle
                des Freitextkastens der Vorlage. */}
            <select
              className="pf-field"
              style={boxStyle(HEAD_BOXES.experience)}
              name="experience"
              defaultValue={stats.experience ?? ""}
              aria-label="Erfahrung"
            >
              <option value="">—</option>
              {EXPERIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* Der Bogen hat genau zwei Kästen für Karriere-Ereignisse. */}
            {[0, 1].map((index) => (
              <textarea
                key={index}
                className="pf-field"
                style={boxStyle(
                  index === 0
                    ? HEAD_BOXES.careerEvent1
                    : HEAD_BOXES.careerEvent2,
                )}
                value={careerEvents[index] ?? ""}
                onChange={(e) =>
                  setCareerEvents((prev) => {
                    const next = [...prev];
                    while (next.length <= index) next.push("");
                    next[index] = e.target.value;
                    return next;
                  })
                }
                aria-label={`Karriere-Ereignis ${index + 1}`}
              />
            ))}

            {/* ── Entschlossenheit, Schutz, Stress ────────────────── */}
            {DETERMINATION_POINTS.map((point, index) => (
              <input
                key={index}
                type="checkbox"
                className="pf-check pf-check--determination"
                style={pointStyle(point)}
                checked={index < determination}
                onChange={() =>
                  // Klick füllt bis hierher auf; erneuter Klick aufs letzte
                  // gefüllte Kästchen leert es wieder.
                  setDetermination(
                    determination === index + 1 ? index : index + 1,
                  )
                }
                aria-label={`Entschlossenheit ${index + 1}`}
              />
            ))}

            <input
              className="pf-resistance"
              style={boxStyle(RESISTANCE_BOX)}
              name="resistance"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              defaultValue={stats.resistance ?? ""}
              aria-label="Schutz (Protection)"
            />

            {/* Der maximale Stress wird berechnet (Fitness + Talent-Bonus)
                und ist deshalb kein Eingabefeld; gepflegt wird nur der Bonus
                — unter dem Blatt, wo der Bogen kein Feld dafür hat. */}
            <input
              className="pf-stress-value"
              style={boxStyle(STRESS_VALUE_BOX)}
              value={maxStress ?? ""}
              readOnly
              title="Ergibt sich aus Fitness + Bonus aus Talenten."
              aria-label="Maximaler Stress"
            />
            {STRESS_POINTS.map((point, index) => (
              <input
                key={index}
                type="checkbox"
                className={
                  maxStress !== null && index < maxStress
                    ? "pf-check"
                    : "pf-check pf-check--out"
                }
                style={pointStyle(point)}
                checked={false}
                disabled
                readOnly
                title="Stress wird am Spieltisch abgestrichen und nicht gespeichert."
                aria-label={`Stress-Kästchen ${index + 1}`}
              />
            ))}

            {/* ── Attribute und Disziplinen ───────────────────────── */}
            {ATTRIBUTE_FIELDS.map((field, index) => (
              <input
                key={field.key}
                className="pf-stat"
                style={boxStyle(ATTRIBUTE_BOXES[field.key])}
                name={`attributes.${field.key}`}
                type="number"
                inputMode="numeric"
                min={ATTRIBUTE_RULE.min}
                max={ATTRIBUTE_RULE.max}
                value={attributes[field.key] ?? ""}
                readOnly={locked}
                aria-invalid={
                  outOfRange(attributes[field.key] ?? "", ATTRIBUTE_RULE) ||
                  attributeOverfilled.has(attributeValues[index] ?? -1) ||
                  undefined
                }
                onChange={(e) =>
                  setAttributes((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                aria-label={field.original ?? field.label}
              />
            ))}
            {DEPARTMENT_FIELDS.map((field, index) => (
              <input
                key={field.key}
                className="pf-stat"
                style={boxStyle(DEPARTMENT_BOXES[field.key])}
                name={`departments.${field.key}`}
                type="number"
                inputMode="numeric"
                min={DEPARTMENT_RULE.min}
                max={DEPARTMENT_RULE.max}
                value={departments[field.key] ?? ""}
                readOnly={locked}
                aria-invalid={
                  outOfRange(departments[field.key] ?? "", DEPARTMENT_RULE) ||
                  departmentOverfilled.has(departmentValues[index] ?? -1) ||
                  undefined
                }
                onChange={(e) =>
                  setDepartments((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                aria-label={field.original ?? field.label}
              />
            ))}

            {/* ── Listen ──────────────────────────────────────────── */}
            {Object.entries(MANAGED_LISTS).map(([key, spec]) => {
              const entries = lists[key] ?? [];
              const free = spec.free ? freeCounts[spec.free] : null;
              const full = free !== null && entries.length >= free;
              const readOnly = locked && key === "focuses";
              return (
                <SheetList
                  key={key}
                  box={LIST_BOXES[key as keyof typeof LIST_BOXES]}
                  entries={entries}
                  onRemove={(index) =>
                    updateList(key, (prev) =>
                      prev.filter((_, i) => i !== index),
                    )
                  }
                  onAdd={() => setAdding(key)}
                  addLabel={`${spec.singular} hinzufügen`}
                  readOnly={readOnly}
                  disabled={full && (spec.enforceFree ?? false)}
                  count={
                    free !== null && !locked
                      ? `${entries.length} / ${free}`
                      : undefined
                  }
                />
              );
            })}

            <SheetList
              box={LIST_BOXES.talents}
              entries={talentEntries}
              onRemove={(index) =>
                setTalentEntries((prev) => prev.filter((_, i) => i !== index))
              }
              onAdd={() => setAdding("talents")}
              addLabel="Talent hinzufügen"
              readOnly={locked}
              disabled={talentEntries.length >= creationFreeTalents}
              count={
                locked
                  ? undefined
                  : `${talentEntries.length} / ${creationFreeTalents}`
              }
            />

            {/* Spezies-Fähigkeit und Sonderregeln bleiben Textfelder: dort
                stehen ganze Regelsätze, keine Aufzählungen. */}
            <textarea
              className="pf-field"
              style={boxStyle(LIST_BOXES.speciesAbilities)}
              name="speciesAbilities"
              defaultValue={stats.speciesAbilities.join("\n")}
              aria-label="Spezies-Fähigkeiten"
            />
            <textarea
              className="pf-field"
              style={boxStyle(LIST_BOXES.specialRules)}
              name="specialRules"
              defaultValue={stats.specialRules.join("\n")}
              aria-label="Sonderregeln"
            />
          </div>
        </div>
      </div>

      {/* ── Was auf dem Papierbogen keinen Platz hat ───────────────── */}
      <div className="lcars-text flex flex-col gap-[12px] pt-[16px]">
        {ruleErrors.length > 0 && (
          <ul className="stat-sheet-errors">
            {ruleErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-[16px]">
          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">Stress-Bonus aus Talenten</span>
            <input
              name="stressBonus"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={stressBonus}
              onChange={(e) => setStressBonus(e.target.value)}
              className="lcars-input rounded-full w-[110px] text-right"
            />
          </label>

          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">
              {portrait ? "Bild ersetzen" : "Bild hochladen"}
            </span>
            <input
              name="portraitFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="lcars-input rounded-full"
            />
          </label>
        </div>

        <SubmitButton pending={pending} pendingLabel="Speichert …">
          Werte speichern
        </SubmitButton>
      </div>

      <FormError message={state?.error} />

      {/* ── Hinzufügen-Fenster ─────────────────────────────────────── */}
      {adding === "talents" && (
        <TalentModal
          talents={talents}
          stats={stats}
          species={species}
          taken={talentEntries}
          cost={null}
          affordable
          onPick={(entry) => {
            setTalentEntries((prev) => [...prev, entry]);
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {adding !== null && adding !== "talents" && (
        <EntryAddModal
          title={`${MANAGED_LISTS[adding].singular} hinzufügen`}
          placeholder={MANAGED_LISTS[adding].placeholder}
          onAdd={(entry) => {
            updateList(adding, (prev) => [...prev, entry]);
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
    </form>
  );
}

// Die verwalteten Listen aus den Werten ziehen — an zwei Stellen gebraucht
// (Initialisierung und Nachziehen bei neuen Serverwerten).
function listSnapshotOf(stats: CharacterStats): Record<string, string[]> {
  return Object.fromEntries(
    Object.keys(MANAGED_LISTS).map((key) => [
      key,
      stats[key as keyof CharacterStats] as string[],
    ]),
  );
}
