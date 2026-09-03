"use client";
import { useMemo, useState } from "react";
import { MinusCircleIcon, PlusIcon } from "@/lib/icons";
import {
  ATTRIBUTE_FIELDS,
  ATTRIBUTE_RULE,
  DEPARTMENT_FIELDS,
  DEPARTMENT_RULE,
  EXPERIENCE_OPTIONS,
  LIST_FIELDS,
  SCALAR_NUMBER_FIELDS,
  TEXT_FIELDS,
  computeStress,
  isCharacterExperience,
  validateDistribution,
  type DistributionRule,
  type NumberFieldSpec,
} from "@/lib/characterStats";
import { creationBudget, type AdvancementRules } from "@/lib/advancement";
import type { CharacterStats } from "@/types/characterStats";
import type { Talent } from "@/lib/talentCatalog";
import { TalentModal } from "./TalentPicker";
import EntryAddModal from "./EntryAddModal";

// Werte-Editor aus normalen Bedienelementen — Gegenstück zum Bogen-Faksimile,
// das seit dem Umbau nur noch Vorschau ist (PersonnelFileView). Genutzt vom
// Anlege-Assistenten (Schritt „Werte") und vom Werte-Panel der Charakterseite,
// solange die Erschaffung offen ist.
//
// Bewusst KONTROLLIERT: die Komponente hält keinen eigenen Wertestand, sondern
// bekommt stats herein und meldet jede Änderung nach oben. So rechnen
// Budget-Anzeige, Vorschau und das abschickende Formular alle mit demselben
// Stand, ohne ihn zu kopieren.

// Freitextlisten, die als ganze Regelsätze gepflegt werden (Spezies-Fähigkeit,
// Sonderregeln) — dort steht in der Runde ein Absatz, keine Aufzählung. Alle
// übrigen Listen laufen über das Hinzufügen-Fenster.
const TEXTAREA_LISTS = new Set(["speciesAbilities", "specialRules"]);
// Talente kommen ausschließlich aus dem Katalog und haben ein eigenes Fenster.
const CATALOG_LIST = "talents";

const LIST_PLACEHOLDERS: Record<string, string> = {
  values: "z.B. „Ich diene der Flotte, nicht dem Ruhm“",
  focuses: "z.B. Warpfeldtheorie",
  pastimes: "z.B. Jazz-Klarinette",
  attacks: "z.B. Phaser Typ 2 (Strahl)",
  equipment: "z.B. Tricorder",
  careerEvents: "z.B. Erste Begegnung mit den Borg",
};

// Freikontingent der Ersterschaffung je Liste, soweit es eines gibt.
function freeCount(key: string, rules: AdvancementRules): number | null {
  if (key === "values") return rules.creationFreeValues;
  if (key === "focuses") return rules.creationFreeFocuses;
  if (key === CATALOG_LIST) return rules.creationFreeTalents;
  return null;
}

// Verbleibendes Erschaffungsbudget eines Bereichs — die wichtigste Zahl
// dieses Schritts und deshalb bewusst gross gesetzt, mit Balken statt einer
// Textzeile am Fuss des Abschnitts (dort ging sie zwischen den Wertekaesten
// unter). Der Balken zeigt den verbrauchten Anteil; ist das Budget
// ueberzogen, laeuft er voll und wechselt in die Warnfarbe.
function BudgetMeter({
  label,
  cost,
  total,
  remaining,
}: {
  label: string;
  cost: number;
  total: number;
  remaining: number;
}) {
  const over = remaining < 0;
  // Ohne Budget (0 AP eingestellt) gibt es nichts zu füllen — sonst führte
  // die Division zu NaN und der Balken verschwände.
  const filled =
    total > 0 ? Math.min(100, Math.round((cost / total) * 100)) : 0;

  return (
    <div className={over ? "stat-budget stat-budget--over" : "stat-budget"}>
      <div className="stat-budget-head">
        <span className="stat-budget-label">{label}</span>
        <span className="stat-budget-spent">
          {cost} / {total} AP verbraucht
        </span>
      </div>
      <div className="stat-budget-figure">
        <strong>{over ? -remaining : remaining}</strong>
        <span>{over ? "AP zu viel" : "AP übrig"}</span>
      </div>
      <div
        className="stat-budget-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={cost}
        aria-label={`${label}: ${cost} von ${total} AP verbraucht`}
      >
        <span style={{ width: `${over ? 100 : filled}%` }} />
      </div>
    </div>
  );
}

function SectionTitle({ en, de }: { en: string; de: string }) {
  return (
    <h3 className="stat-sheet-section-title">
      {en} <span className="stat-label-secondary">{de}</span>
    </h3>
  );
}

// Ein Zahlenkasten (Attribut oder Disziplin). Der Wert bleibt als String im
// Formular — ein leeres Feld ist „nicht gepflegt", nicht 0.
function ValueBox({
  field,
  value,
  onChange,
  invalid,
  readOnly,
  idPrefix,
}: {
  field: NumberFieldSpec<string>;
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  readOnly: boolean;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;
  return (
    <div className="stat-editor-value">
      <label htmlFor={id} className="stat-field-label">
        <span className="stat-label-primary">
          {field.original ?? field.label}
        </span>
        <span className="stat-label-secondary">{field.label}</span>
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`stat-editor-value-input${invalid ? " stat-editor-value-input--bad" : ""}`}
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

// Markiert die Kästen, die an einer Häufungsgrenze beteiligt sind (alle Werte
// auf dem Maximum bzw. eins darunter) — so wird sichtbar, WO die Regel klemmt.
function overfilledValues(
  values: (number | null)[],
  rule: DistributionRule,
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

export default function CharacterValuesEditor({
  stats,
  onChange,
  rules,
  talents,
  species,
  idPrefix,
}: {
  stats: CharacterStats;
  onChange: (next: CharacterStats) => void;
  // Das geltende AP-Regelwerk — Budgets und Freikontingente der Erschaffung.
  rules: AdvancementRules;
  // Talent-Katalog für die Auswahl (gepflegt unter /gm/talents).
  talents: Talent[];
  // Spezies der Akte — für Voraussetzungen wie „Vulcan".
  species: string | null;
  // Präfix der Feld-IDs; auf einer Seite können zwei Editoren stehen.
  idPrefix: string;
}) {
  // Welches Hinzufügen-Fenster offen ist (Listen-Schlüssel), null = keines.
  const [adding, setAdding] = useState<string | null>(null);

  // Nach dem Festschreiben sind Attribute, Disziplinen, Talente und
  // Schwerpunkte nur noch über AP veränderbar (siehe advancementAction) — der
  // Editor zeigt sie dann nur noch an. Verbindlich ist die Prüfung im Server.
  const locked = stats.creationLocked;

  function patch(next: Partial<CharacterStats>) {
    onChange({ ...stats, ...next });
  }

  function setNumber(
    key: string,
    raw: string,
    group?: "attributes" | "departments",
  ) {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    const value = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    if (group) {
      patch({
        [group]: { ...stats[group], [key]: value },
      } as Partial<CharacterStats>);
    } else {
      patch({ [key]: value } as Partial<CharacterStats>);
    }
  }

  function setList(key: string, update: (prev: string[]) => string[]) {
    const prev = (stats as unknown as Record<string, string[]>)[key] ?? [];
    patch({ [key]: update(prev) } as unknown as Partial<CharacterStats>);
  }

  function numberValue(value: number | null): string {
    return value === null ? "" : String(value);
  }

  const attributeValues = ATTRIBUTE_FIELDS.map((f) => stats.attributes[f.key]);
  const departmentValues = DEPARTMENT_FIELDS.map(
    (f) => stats.departments[f.key],
  );

  // Regelverstöße live anzeigen — verbindlich geprüft wird in der Action.
  const ruleErrors = useMemo(
    () => [
      ...validateDistribution(attributeValues, ATTRIBUTE_RULE, "Attribute"),
      ...validateDistribution(departmentValues, DEPARTMENT_RULE, "Disziplinen"),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abgeleitet aus den beiden Wertegruppen
    [stats.attributes, stats.departments],
  );

  const attributeOver = overfilledValues(attributeValues, ATTRIBUTE_RULE);
  const departmentOver = overfilledValues(departmentValues, DEPARTMENT_RULE);
  const budget = creationBudget(stats, rules);
  const maxStress = computeStress(stats);

  const managedLists = LIST_FIELDS.filter(
    (field) => !TEXTAREA_LISTS.has(field.key),
  );

  return (
    <div className="flex flex-col gap-[16px]">
      {/* ── Kopfdaten ─────────────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Personnel File" de="Kopfdaten" />
        <div className="stat-editor-body">
          <div className="stat-editor-grid">
            {TEXT_FIELDS.map((field) => (
              <div key={field.key} className="stat-editor-field">
                <label
                  htmlFor={`${idPrefix}-${field.key}`}
                  className="stat-field-label"
                >
                  <span className="stat-label-primary">
                    {field.original ?? field.label}
                  </span>
                  <span className="stat-label-secondary">{field.label}</span>
                </label>
                <input
                  id={`${idPrefix}-${field.key}`}
                  type="text"
                  value={stats[field.key] ?? ""}
                  onChange={(e) =>
                    patch({
                      [field.key]: e.target.value,
                    } as Partial<CharacterStats>)
                  }
                  className="stat-field-input"
                />
              </div>
            ))}

            <div className="stat-editor-field">
              <label
                htmlFor={`${idPrefix}-experience`}
                className="stat-field-label"
              >
                <span className="stat-label-primary">Experience</span>
                <span className="stat-label-secondary">Erfahrungsstufe</span>
              </label>
              <select
                id={`${idPrefix}-experience`}
                value={stats.experience ?? ""}
                onChange={(e) =>
                  patch({
                    experience: isCharacterExperience(e.target.value)
                      ? e.target.value
                      : null,
                  })
                }
                className="stat-field-input"
              >
                <option value="">— keine Angabe —</option>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ── Attribute ─────────────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Attributes" de="Attribute" />
        {!locked && (
          <BudgetMeter
            label="Attribute"
            cost={budget.attributeCost}
            total={rules.creationAttributeBudget}
            remaining={budget.attributeRemaining}
          />
        )}
        <p className="stat-sheet-rule">
          Werte von {ATTRIBUTE_RULE.min} bis {ATTRIBUTE_RULE.max}; höchstens{" "}
          {ATTRIBUTE_RULE.maxAtMax} Attribut auf {ATTRIBUTE_RULE.max} und{" "}
          {ATTRIBUTE_RULE.maxAtSecond} auf {ATTRIBUTE_RULE.max - 1}.
        </p>
        <div className="stat-editor-body">
          <div className="stat-editor-values">
            {ATTRIBUTE_FIELDS.map((field) => (
              <ValueBox
                key={field.key}
                field={field}
                idPrefix={`${idPrefix}-attr`}
                value={numberValue(stats.attributes[field.key])}
                readOnly={locked}
                invalid={
                  stats.attributes[field.key] !== null &&
                  attributeOver.has(stats.attributes[field.key] as number)
                }
                onChange={(next) => setNumber(field.key, next, "attributes")}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Disziplinen ───────────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Departments" de="Disziplinen" />
        {!locked && (
          <BudgetMeter
            label="Disziplinen"
            cost={budget.departmentCost}
            total={rules.creationDepartmentBudget}
            remaining={budget.departmentRemaining}
          />
        )}
        <p className="stat-sheet-rule">
          Werte von {DEPARTMENT_RULE.min} bis {DEPARTMENT_RULE.max}; höchstens{" "}
          {DEPARTMENT_RULE.maxAtMax} Disziplin auf {DEPARTMENT_RULE.max} und{" "}
          {DEPARTMENT_RULE.maxAtSecond} auf {DEPARTMENT_RULE.max - 1}.
        </p>
        <div className="stat-editor-body">
          <div className="stat-editor-values">
            {DEPARTMENT_FIELDS.map((field) => (
              <ValueBox
                key={field.key}
                field={field}
                idPrefix={`${idPrefix}-dep`}
                value={numberValue(stats.departments[field.key])}
                readOnly={locked}
                invalid={
                  stats.departments[field.key] !== null &&
                  departmentOver.has(stats.departments[field.key] as number)
                }
                onChange={(next) => setNumber(field.key, next, "departments")}
              />
            ))}
          </div>

          {ruleErrors.length > 0 && (
            <ul className="stat-sheet-errors">
              {ruleErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Abgeleitete Werte ─────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Derived" de="Abgeleitete Werte" />
        <p className="stat-sheet-rule">
          Der maximale Stress ergibt sich aus Fitness und dem Bonus aus Talenten
          und ist deshalb kein Eingabefeld.
        </p>
        <div className="stat-editor-body">
          <div className="stat-editor-grid">
            {SCALAR_NUMBER_FIELDS.map((field) => (
              <div key={field.key} className="stat-editor-field">
                <label
                  htmlFor={`${idPrefix}-${field.key}`}
                  className="stat-field-label"
                >
                  <span className="stat-label-primary">
                    {field.original ?? field.label}
                  </span>
                  <span className="stat-label-secondary">{field.label}</span>
                </label>
                <input
                  id={`${idPrefix}-${field.key}`}
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  value={numberValue(stats[field.key])}
                  onChange={(e) => setNumber(field.key, e.target.value)}
                  className="stat-field-input"
                />
              </div>
            ))}
          </div>
          <p className="stat-editor-derived">
            <span>Max. Stress</span>
            <strong>{maxStress ?? "—"}</strong>
            <span>
              {maxStress === null
                ? "(Fitness eintragen)"
                : `Fitness ${stats.attributes.fitness} + Bonus ${stats.stressBonus ?? 0}`}
            </span>
          </p>
        </div>
      </section>

      {/* ── Listen ────────────────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Lists" de="Listen" />
        <div className="stat-editor-body">
          {managedLists.map((field) => {
            const entries =
              (stats as unknown as Record<string, string[]>)[field.key] ?? [];
            const free = freeCount(field.key, rules);
            const isCatalog = field.key === CATALOG_LIST;
            // Talente und Schwerpunkte sind nach dem Festschreiben nur noch
            // über AP zu haben; die übrigen Listen bleiben frei pflegbar.
            const listLocked = locked && (isCatalog || field.key === "focuses");
            return (
              <div key={field.key} className="stat-editor-list">
                <div className="stat-editor-list-head">
                  <span className="stat-field-label">
                    <span className="stat-label-primary">
                      {field.original ?? field.label}
                    </span>
                    <span className="stat-label-secondary">{field.label}</span>
                  </span>
                  <span className="flex items-center gap-[8px]">
                    {free !== null && !locked && (
                      <span className="stat-editor-list-count">
                        {entries.length} / {free} frei
                      </span>
                    )}
                    {!listLocked && (
                      // Icon statt Beschriftung: die Pille „Hinzufügen" war
                      // 180px breit und schob die Listenkopfzeile auf einem
                      // Telefon über den Bildschirmrand hinaus. Was sie tut,
                      // steht im aria-label/title.
                      <button
                        type="button"
                        onClick={() => setAdding(field.key)}
                        className="lcars-icon-btn"
                        aria-label={
                          isCatalog
                            ? `Talent wählen (${field.label})`
                            : `${field.label}: Eintrag hinzufügen`
                        }
                        title={
                          isCatalog ? "Talent wählen" : "Eintrag hinzufügen"
                        }
                      >
                        <PlusIcon />
                      </button>
                    )}
                  </span>
                </div>

                {entries.length === 0 ? (
                  <p className="stat-editor-list-empty">
                    Noch nichts eingetragen.
                  </p>
                ) : (
                  entries.map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      className="stat-editor-list-line"
                    >
                      <span>{entry}</span>
                      {!listLocked && (
                        <button
                          type="button"
                          onClick={() =>
                            setList(field.key, (prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          className="lcars-icon-btn"
                          aria-label={`${entry} entfernen`}
                          title={`${entry} entfernen`}
                        >
                          <MinusCircleIcon />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}

          {/* Spezies-Fähigkeit und Sonderregeln sind ganze Regelsätze, keine
              Aufzählungen — sie bleiben Textfelder, eine Zeile je Eintrag. */}
          {LIST_FIELDS.filter((field) => TEXTAREA_LISTS.has(field.key)).map(
            (field) => (
              <div key={field.key} className="stat-editor-field">
                <label
                  htmlFor={`${idPrefix}-${field.key}`}
                  className="stat-field-label"
                >
                  <span className="stat-label-primary">
                    {field.original ?? field.label}
                  </span>
                  <span className="stat-label-secondary">{field.label}</span>
                </label>
                <textarea
                  id={`${idPrefix}-${field.key}`}
                  value={(
                    (stats as unknown as Record<string, string[]>)[field.key] ??
                    []
                  ).join("\n")}
                  onChange={(e) =>
                    setList(field.key, () => e.target.value.split("\n"))
                  }
                  rows={3}
                  className="stat-field-input font-mono"
                />
              </div>
            ),
          )}
        </div>
      </section>

      {/* ── Hinzufügen-Fenster ────────────────────────────────────── */}
      {adding === CATALOG_LIST && (
        <TalentModal
          talents={talents}
          stats={stats}
          species={species}
          taken={stats.talents}
          // Während der Erschaffung kommen Talente aus dem Freikontingent —
          // kosten also nichts. Gesteigert wird über das AP-Panel.
          cost={null}
          affordable
          onPick={(entry) => {
            setList(CATALOG_LIST, (prev) => [...prev, entry]);
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {adding !== null && adding !== CATALOG_LIST && (
        <EntryAddModal
          title={`${LIST_FIELDS.find((f) => f.key === adding)?.label ?? "Eintrag"} hinzufügen`}
          placeholder={LIST_PLACEHOLDERS[adding] ?? ""}
          onAdd={(entry) => {
            setList(adding, (prev) => [...prev, entry]);
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}
