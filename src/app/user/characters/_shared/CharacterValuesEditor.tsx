"use client";
import { useMemo, useState, type ReactNode } from "react";
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
import {
  attributeStepCost,
  checkAdvancement,
  creationBudget,
  departmentStepCost,
  type AdvancementRules,
} from "@/lib/advancement";
import type { CharacterStats } from "@/types/characterStats";
import { parseTalentEntry, type Talent } from "@/lib/talentCatalog";
import type { Focus } from "@/lib/focusCatalog";
import { TalentModal } from "./TalentPicker";
import { FocusModal } from "./FocusPicker";
import EntryAddModal from "./EntryAddModal";
import CharacterRoleSelect from "./CharacterRoleSelect";
import { getAdditionalRoleBonusNotes, getRoleBonusEntries, getSpeciesAbilityChoices, findRoleOption } from "@/lib/sta2eCharacterOptions";
import {
  careerEventByIdOrTitle,
  careerEventTitle,
  rollCareerEvent,
  STA2E_CAREER_EVENTS,
} from "@/lib/sta2eCareerEvents";
import Sta2eLifepathBuilder from "./Sta2eLifepathBuilder";
import { applySta2eLifepath } from "@/lib/sta2eLifepath";
import {
  checkSta2ePointBuy,
  sta2ePointBuyTotals,
  STA2E_POINT_BUY_ATTRIBUTE_TOTAL,
  STA2E_POINT_BUY_DEPARTMENT_TOTAL,
} from "@/lib/sta2ePointBuy";

export interface InlineAdvancement {
  characterId: number;
  availableAp: number;
  pending: boolean;
  submit: (payload: FormData) => void;
}

// Werte-Editor aus normalen Bedienelementen — Gegenstück zum Bogen-Faksimile,
// das seit dem Umbau nur noch Vorschau ist (PersonnelFileView). Genutzt vom
// Anlege-Assistenten (Schritt „Werte") und vom Werte-Panel der Charakterseite,
// solange die Erschaffung offen ist.
//
// Bewusst KONTROLLIERT: die Komponente hält keinen eigenen Wertestand, sondern
// bekommt stats herein und meldet jede Änderung nach oben. So rechnen
// Budget-Anzeige, Vorschau und das abschickende Formular alle mit demselben
// Stand, ohne ihn zu kopieren.

// Diese Bereiche werden aus Spezies- und Rollenkatalogen dargestellt und
// brauchen daher kein allgemeines Listen-Hinzufügen-Fenster.
const TEXTAREA_LISTS = new Set(["speciesAbilities", "specialRules"]);
// Talente und Schwerpunkte kommen ausschließlich aus ihrem Katalog und haben
// je ein eigenes Auswahlfenster (TalentPicker/FocusPicker) statt des freien
// Eingabefelds.
const CATALOG_LIST = "talents";
const FOCUS_LIST = "focuses";

const LIST_PLACEHOLDERS: Record<string, string> = {
  values: "z.B. „Ich diene der Flotte, nicht dem Ruhm“",
  pastimes: "z.B. Jazz-Klarinette",
  attacks: "z.B. Phaser Typ 2 (Strahl)",
  equipment: "z.B. Tricorder",
};

// Freikontingent der Ersterschaffung je Liste, soweit es eines gibt.
function freeCount(key: string, rules: AdvancementRules): number | null {
  if (key === "values") return rules.creationFreeValues;
  if (key === FOCUS_LIST) return rules.creationFreeFocuses;
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
  unit = "AP",
}: {
  label: string;
  cost: number;
  total: number;
  remaining: number;
  unit?: "AP" | "Punkte";
}) {
  const over = remaining < 0;
  const verb = unit === "AP" ? "verbraucht" : "verteilt";
  const remainingLabel = unit === "AP" ? "AP übrig" : "Punkte zu verteilen";
  const overLabel = unit === "AP" ? "AP zu viel" : "Punkte zu viel";
  // Ohne Budget (0 AP eingestellt) gibt es nichts zu füllen — sonst führte
  // die Division zu NaN und der Balken verschwände.
  const filled =
    total > 0 ? Math.min(100, Math.round((cost / total) * 100)) : 0;

  return (
    <div className={over ? "stat-budget stat-budget--over" : "stat-budget"}>
      <div className="stat-budget-head">
        <span className="stat-budget-label">{label}</span>
        <span className="stat-budget-spent">
          {cost} / {total} {unit} {verb}
        </span>
      </div>
      <div className="stat-budget-figure">
        <strong>{over ? -remaining : remaining}</strong>
        <span>{over ? overLabel : remainingLabel}</span>
      </div>
      <div
        className="stat-budget-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={cost}
        aria-label={`${label}: ${cost} von ${total} ${unit} ${verb}`}
      >
        <span style={{ width: `${over ? 100 : filled}%` }} />
      </div>
    </div>
  );
}

function SectionTitle({
  en,
  de,
  flat,
}: {
  en: string;
  de: string;
  flat: boolean;
}) {
  return (
    <h3
      className={
        flat ? "stat-editor-section-title" : "stat-sheet-section-title"
      }
    >
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
  advanceButton,
}: {
  field: NumberFieldSpec<string>;
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  readOnly: boolean;
  idPrefix: string;
  advanceButton?: ReactNode;
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
      <div className="stat-editor-value-control">
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
        {advanceButton}
      </div>
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

function advancementWouldExceedDistribution(
  values: (number | null)[],
  targetIndex: number,
  nextValue: number,
  rule: DistributionRule,
): boolean {
  const after = values.map((value, index) =>
    index === targetIndex ? nextValue : value,
  );
  return (
    after.filter((value) => value === rule.max).length > rule.maxAtMax ||
    after.filter((value) => value === rule.max - 1).length > rule.maxAtSecond
  );
}

export default function CharacterValuesEditor({
  stats,
  onChange,
  rules,
  talents,
  focuses,
  species,
  idPrefix,
  advancement,
  showPersonnelFields = true,
  flatSections = false,
}: {
  stats: CharacterStats;
  onChange: (next: CharacterStats) => void;
  // Das geltende AP-Regelwerk — Budgets und Freikontingente der Erschaffung.
  rules: AdvancementRules;
  // Talent-Katalog für die Auswahl (gepflegt unter /gm/talents).
  talents: Talent[];
  // Schwerpunkt-Katalog für die Auswahl (gepflegt unter /gm/focuses).
  focuses: Focus[];
  // Spezies der Akte — für Voraussetzungen wie „Vulcan".
  species: string[];
  // Präfix der Feld-IDs; auf einer Seite können zwei Editoren stehen.
  idPrefix: string;
  // Nur auf der eigenen Charakterseite nach abgeschlossener Erschaffung:
  // Inline-Steigerungen verwenden dieselbe Action und dieselbe Kostenprüfung
  // wie früher das separate Advancement-Panel.
  advancement?: InlineAdvancement;
  // Der Anlege-Assistent führt diese Angaben weiterhin in seinem Werte-
  // Schritt. Auf der bestehenden Charakterseite liegen sie dagegen in der
  // zusammengeführten Personalakte und würden hier doppelt erscheinen.
  showPersonnelFields?: boolean;
  // Auf der bestehenden Charakterseite liegt der Editor bereits in einem
  // gerahmten, aufklappbaren Werte-Panel. Dort brauchen die Untergruppen
  // keine weiteren Panelrahmen; im Anlege-Assistenten bleiben sie erhalten.
  flatSections?: boolean;
}) {
  // Welches Hinzufügen-Fenster offen ist (Listen-Schlüssel), null = keines.
  const [adding, setAdding] = useState<string | null>(null);

  // Nach dem Festschreiben sind Attribute, Disziplinen, Talente und
  // Schwerpunkte nur noch über AP veränderbar (siehe advancementAction) — der
  // Editor zeigt sie dann nur noch an. Verbindlich ist die Prüfung im Server.
  const locked = stats.creationLocked;
  const lifepathMode = stats.creationMethod === "sta2e-lifepath";
  const pointBuyMode = stats.creationMethod === "sta2e-point-buy";

  function patch(next: Partial<CharacterStats>) {
    const updated = { ...stats, ...next };
    onChange(lifepathMode ? applySta2eLifepath(updated, species) : updated);
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

  function setCareerEvent(index: number, value: string) {
    const next = [...stats.careerEvents];
    if (!value) {
      // Beim Entfernen rückt ein eventuell vorhandenes zweites Ereignis in
      // den ersten Platz nach — die beiden Lifepath-Schritte bleiben kompakt.
      next.splice(index, 1);
    } else {
      next[index] = value;
    }
    patch({ careerEvents: next });
  }

  function drawCareerEvent(index: number) {
    const event = rollCareerEvent();
    setCareerEvent(index, event.id);
  }

  function numberValue(value: number | null): string {
    return value === null ? "" : String(value);
  }

  function advanceButton(
    kind: "attribute" | "department",
    key: string,
    current: number | null,
  ): ReactNode {
    if (!locked || !advancement) return undefined;
    const fields = kind === "attribute" ? ATTRIBUTE_FIELDS : DEPARTMENT_FIELDS;
    const rule = kind === "attribute" ? ATTRIBUTE_RULE : DEPARTMENT_RULE;
    const values =
      kind === "attribute"
        ? ATTRIBUTE_FIELDS.map((field) => stats.attributes[field.key])
        : DEPARTMENT_FIELDS.map((field) => stats.departments[field.key]);
    const targetIndex = fields.findIndex((field) => field.key === key);
    if (targetIndex < 0) return undefined;
    if (
      current !== null &&
      (current >= rule.max ||
        advancementWouldExceedDistribution(
          values,
          targetIndex,
          current + 1,
          rule,
        ))
    ) {
      return undefined;
    }
    const next = current === null ? null : current + 1;
    const cost =
      next === null
        ? null
        : kind === "attribute"
          ? attributeStepCost(next, rules)
          : departmentStepCost(next, rules);
    const check = checkAdvancement(
      stats,
      { kind, key },
      advancement.availableAp,
      rules,
    );
    const allowed = check.ok;

    return (
      <button
        type="button"
        disabled={advancement.pending || !allowed}
        title={
          allowed
            ? `Danach bleiben ${advancement.availableAp - check.plan.cost} AP`
            : check.error
        }
        className={`stat-inline-advance ${
          allowed
            ? "stat-inline-advance--allowed"
            : "stat-inline-advance--blocked"
        }`}
        onClick={() => {
          const payload = new FormData();
          payload.set("characterId", String(advancement.characterId));
          payload.set("kind", kind);
          payload.set("key", key);
          advancement.submit(payload);
        }}
      >
        +1 · {cost ?? "—"} AP
      </button>
    );
  }

  const attributeValues = ATTRIBUTE_FIELDS.map((f) => stats.attributes[f.key]);
  const departmentValues = DEPARTMENT_FIELDS.map(
    (f) => stats.departments[f.key],
  );

  // Regelverstöße live anzeigen — verbindlich geprüft wird in der Action.
  const ruleErrors = useMemo(
    () => [...new Set([
      ...validateDistribution(attributeValues, ATTRIBUTE_RULE, "Attribute"),
      ...validateDistribution(departmentValues, DEPARTMENT_RULE, "Disziplinen"),
      ...(pointBuyMode ? checkSta2ePointBuy(stats) : []),
    ])],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abgeleitet aus den beiden Wertegruppen
    [stats.attributes, stats.departments, pointBuyMode],
  );

  const attributeOver = overfilledValues(attributeValues, ATTRIBUTE_RULE);
  const departmentOver = overfilledValues(departmentValues, DEPARTMENT_RULE);
  const budget = creationBudget(stats, rules);
  const pointTotals = sta2ePointBuyTotals(stats);
  const maxStress = computeStress(stats);
  const speciesAbilityChoices = getSpeciesAbilityChoices(species);
  const knownAbilityValues = new Set(
    getSpeciesAbilityChoices(
      // Nur zum Erkennen und Erhalt älterer Einträge, die nicht mehr zu einer
      // aktuell ausgewählten Spezies gehören.
      species,
    ).map((choice) => choice.value),
  );
  const legacySpeciesAbilities = stats.speciesAbilities.filter(
    (entry) => !knownAbilityValues.has(entry),
  );
  const roleOption = findRoleOption(stats.characterRole);
  const roleBonusEntries = getRoleBonusEntries(
    stats.characterRole,
    stats.specialRules,
  );

  const managedLists = LIST_FIELDS.filter(
    (field) => !TEXTAREA_LISTS.has(field.key) && field.key !== "careerEvents",
  );
  const sectionClassName = flatSections
    ? "stat-editor-section"
    : "stat-sheet-section";

  return (
    <div className="flex flex-col gap-[16px]">
      {lifepathMode && (
        <Sta2eLifepathBuilder
          stats={stats}
          onChange={onChange}
          species={species}
          talents={talents}
          focuses={focuses}
          readOnly={locked}
        />
      )}

      {showPersonnelFields && !lifepathMode && (
        <section className={sectionClassName}>
          <SectionTitle
            en="Personnel File"
            de="Kopfdaten"
            flat={flatSections}
          />
          <div className="stat-editor-body">
            <div className="stat-editor-grid">
              {TEXT_FIELDS.filter((field) => field.key !== "characterRole").map((field) => (
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
                    onChange={(event) =>
                      patch({
                        [field.key]: event.target.value,
                      } as Partial<CharacterStats>)
                    }
                    className="stat-field-input"
                  />
                </div>
              ))}
              <CharacterRoleSelect
                id={`${idPrefix}-characterRole`}
                value={stats.characterRole}
                onChange={(value) => patch({ characterRole: value })}
              />

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
                  onChange={(event) =>
                    patch({
                      experience: isCharacterExperience(event.target.value)
                        ? event.target.value
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
      )}

      {/* ── Attribute ─────────────────────────────────────────────── */}
      <section className={sectionClassName}>
        <SectionTitle en="Attributes" de="Attribute" flat={flatSections} />
        {!locked && pointBuyMode && (
          <BudgetMeter
            label="Attributsumme"
            cost={pointTotals.attributes}
            total={STA2E_POINT_BUY_ATTRIBUTE_TOTAL}
            remaining={STA2E_POINT_BUY_ATTRIBUTE_TOTAL - pointTotals.attributes}
            unit="Punkte"
          />
        )}
        {!locked && !lifepathMode && !pointBuyMode && (
          <BudgetMeter
            label="Attribute"
            cost={budget.attributeCost}
            total={rules.creationAttributeBudget}
            remaining={budget.attributeRemaining}
          />
        )}
        <p className="stat-sheet-rule">
          {pointBuyMode && <>Punktesystem: Startwert 7, Gesamt 56 (14 Punkte zusätzlich verteilen). </>}
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
                readOnly={locked || lifepathMode}
                invalid={
                  stats.attributes[field.key] !== null &&
                  attributeOver.has(stats.attributes[field.key] as number)
                }
                onChange={(next) => setNumber(field.key, next, "attributes")}
                advanceButton={advanceButton(
                  "attribute",
                  field.key,
                  stats.attributes[field.key],
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Disziplinen ───────────────────────────────────────────── */}
      <section className={sectionClassName}>
        <SectionTitle en="Departments" de="Disziplinen" flat={flatSections} />
        {!locked && pointBuyMode && (
          <BudgetMeter
            label="Disziplinensumme"
            cost={pointTotals.departments}
            total={STA2E_POINT_BUY_DEPARTMENT_TOTAL}
            remaining={STA2E_POINT_BUY_DEPARTMENT_TOTAL - pointTotals.departments}
            unit="Punkte"
          />
        )}
        {!locked && !lifepathMode && !pointBuyMode && (
          <BudgetMeter
            label="Disziplinen"
            cost={budget.departmentCost}
            total={rules.creationDepartmentBudget}
            remaining={budget.departmentRemaining}
          />
        )}
        <p className="stat-sheet-rule">
          {pointBuyMode && <>Punktesystem: Startwert 1, Gesamt 16 (10 Punkte zusätzlich verteilen). </>}
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
                readOnly={locked || lifepathMode}
                invalid={
                  stats.departments[field.key] !== null &&
                  departmentOver.has(stats.departments[field.key] as number)
                }
                onChange={(next) => setNumber(field.key, next, "departments")}
                advanceButton={advanceButton(
                  "department",
                  field.key,
                  stats.departments[field.key],
                )}
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
      <section className={sectionClassName}>
        <SectionTitle en="Derived" de="Abgeleitete Werte" flat={flatSections} />
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
      <section className={sectionClassName}>
        <SectionTitle en="Lists" de="Listen" flat={flatSections} />
        <div className="stat-editor-body">
          {managedLists.map((field) => {
            const entries =
              (stats as unknown as Record<string, string[]>)[field.key] ?? [];
            const free = freeCount(field.key, rules);
            const isCatalog = field.key === CATALOG_LIST;
            const isFocus = field.key === FOCUS_LIST;
            // Talente und Schwerpunkte sind nach dem Festschreiben nur noch
            // über AP zu haben; die übrigen Listen bleiben frei pflegbar.
            const listLocked = (locked && (isCatalog || isFocus)) ||
              (lifepathMode && ["values", "focuses", "talents"].includes(field.key)) ||
              (locked && lifepathMode && field.key === "speciesAbilities");
            const listCost = isCatalog ? rules.talentCost : rules.focusCost;
            const hasCatalogEntries = isCatalog
              ? talents.length > 0
              : focuses.length > 0;
            const canBuyListEntry =
              hasCatalogEntries && (advancement?.availableAp ?? -1) >= listCost;
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
                    {free !== null && !locked && !lifepathMode && (
                      <span className="stat-editor-list-count">
                        {entries.length} / {free} frei
                      </span>
                    )}
                    {listLocked && (isCatalog || isFocus) && advancement ? (
                      <button
                        type="button"
                        disabled={advancement.pending || !canBuyListEntry}
                        onClick={() => setAdding(field.key)}
                        className={`stat-inline-advance ${
                          canBuyListEntry
                            ? "stat-inline-advance--allowed"
                            : "stat-inline-advance--blocked"
                        }`}
                        aria-label={`${field.label} hinzufügen für ${
                          listCost
                        } AP`}
                        title={
                          canBuyListEntry
                            ? `${field.label} hinzufügen`
                            : hasCatalogEntries
                              ? "Nicht genug AP"
                              : "Der Katalog ist leer"
                        }
                      >
                        <PlusIcon />
                        {listCost} AP
                      </button>
                    ) : !listLocked ? (
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
                            : isFocus
                              ? `Schwerpunkt wählen (${field.label})`
                              : `${field.label}: Eintrag hinzufügen`
                        }
                        title={
                          isCatalog
                            ? "Talent wählen"
                            : isFocus
                              ? "Schwerpunkt wählen"
                              : "Eintrag hinzufügen"
                        }
                      >
                        <PlusIcon />
                      </button>
                    ) : null}
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
                      <span>{isCatalog ? parseTalentEntry(entry).name : entry}</span>
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

          {!lifepathMode && <div className="stat-editor-list">
            <div className="stat-editor-list-head">
              <span className="stat-field-label">
                <span className="stat-label-primary">Career Events</span>
                <span className="stat-label-secondary">Karriere-Ereignisse</span>
              </span>
            </div>
            <p className="stat-sheet-rule">
              Wähle oder würfle zwei Ereignisse. Jedes gewährt +1 auf das
              angegebene Attribut und die Disziplin sowie einen Fokus; die
              Ereignisse nennen passende Fokusvorschläge. Die Zuwächse trägst
              du in den jeweiligen Wertefeldern ein.
            </p>
            <div className="stat-editor-grid">
              {[0, 1].map((index) => {
                const selectedValue = stats.careerEvents[index] ?? "";
                const event = selectedValue
                  ? careerEventByIdOrTitle(selectedValue)
                  : null;
                const legacyValue =
                  selectedValue && !event ? selectedValue : null;
                const attribute = event
                  ? event.attribute === "any"
                    ? "beliebig"
                    : ATTRIBUTE_FIELDS.find((field) => field.key === event.attribute)?.label ?? event.attribute
                  : null;
                const department = event
                  ? event.department === "any"
                    ? "beliebig"
                    : DEPARTMENT_FIELDS.find((field) => field.key === event.department)?.label ?? event.department
                  : null;

                return (
                  <div className="stat-editor-field" key={index}>
                    <label
                      className="stat-field-label"
                      htmlFor={`${idPrefix}-career-event-${index + 1}`}
                    >
                      <span className="stat-label-primary">Career Event {index + 1}</span>
                      <span className="stat-label-secondary">Karriere-Ereignis {index + 1}</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <select
                        id={`${idPrefix}-career-event-${index + 1}`}
                        value={selectedValue}
                        disabled={index === 1 && !stats.careerEvents[0]}
                        onChange={(e) => setCareerEvent(index, e.target.value)}
                        className="stat-field-input min-w-0 flex-1"
                      >
                        <option value="">— Ereignis wählen —</option>
                        {legacyValue && (
                          <option value={legacyValue}>{legacyValue} (Alt-Eintrag)</option>
                        )}
                        {STA2E_CAREER_EVENTS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.roll}. {option.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={index === 1 && !stats.careerEvents[0]}
                        onClick={() => drawCareerEvent(index)}
                        className="lcars-pill-btn--outline"
                        aria-label={`Career Event ${index + 1} mit einem W20 würfeln`}
                      >
                        W20 würfeln
                      </button>
                    </div>
                    {event && (
                      <div className="character-role-bonus-rule mt-[8px]">
                        <p>{event.summary}</p>
                        <p>
                          <strong>Bonus:</strong> +1 Attribut ({attribute}), +1
                          Disziplin ({department}), 1 Fokus.
                        </p>
                        <p>
                          <strong>Fokusvorschläge:</strong>{" "}
                          {event.focusSuggestions.join(" · ")}
                        </p>
                        {event.optionalTrait && (
                          <p>
                            <strong>Optionales Trait:</strong> {event.optionalTrait}
                          </p>
                        )}
                      </div>
                    )}
                    {legacyValue && (
                      <p className="stat-sheet-rule mt-[8px]">
                        Dieser ältere Freitext bleibt erhalten. Für die
                        STA-2e-Boni kannst du ein Ereignis aus der Auswahl
                        übernehmen.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {stats.careerEvents.length > 2 && (
              <div className="character-ability-legacy">
                <span className="stat-label-secondary">Weitere gespeicherte Einträge</span>
                {stats.careerEvents.slice(2).map((entry, index) => (
                  <div className="stat-editor-list-line" key={`${entry}-${index}`}>
                    <span>{careerEventTitle(entry)}</span>
                    <button
                      type="button"
                      onClick={() => setCareerEvent(index + 2, "")}
                      className="lcars-icon-btn"
                      aria-label={`${careerEventTitle(entry)} entfernen`}
                      title={`${careerEventTitle(entry)} entfernen`}
                    >
                      <MinusCircleIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {(speciesAbilityChoices.length > 0 || legacySpeciesAbilities.length > 0) && (
            <fieldset className="stat-editor-field character-ability-picker">
              <legend className="stat-field-label">
                <span className="stat-label-primary">Species Ability</span>
                <span className="stat-label-secondary">Spezies-Fähigkeiten</span>
              </legend>
              {speciesAbilityChoices.map((choice) => (
                <label key={choice.value} className="character-ability-option">
                  <input
                    type="checkbox"
                    checked={stats.speciesAbilities.includes(choice.value)}
                    onChange={(event) =>
                      setList("speciesAbilities", (previous) =>
                        event.target.checked
                          ? [...previous, choice.value]
                          : previous.filter((entry) => entry !== choice.value),
                      )
                    }
                  />
                  <span>
                    <strong>{choice.value}</strong>
                    <span>{choice.description}</span>
                  </span>
                </label>
              ))}
              {legacySpeciesAbilities.length > 0 && (
                <div className="character-ability-legacy">
                  <span className="stat-label-secondary">Weitere gespeicherte Einträge</span>
                  {legacySpeciesAbilities.map((entry) => (
                    <div className="stat-editor-list-line" key={entry}>
                      <span>{entry}</span>
                      <button
                        type="button"
                        onClick={() => setList("speciesAbilities", (previous) => previous.filter((item) => item !== entry))}
                        className="lcars-icon-btn"
                        aria-label={`${entry} entfernen`}
                        title={`${entry} entfernen`}
                      >
                        <MinusCircleIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          )}
          {(stats.characterRole || stats.specialRules.length > 0) && (
            <div className="stat-editor-field character-role-bonus">
              <span className="stat-field-label">
                <span className="stat-label-primary">Role Bonus</span>
                <span className="stat-label-secondary">Rollenbonus</span>
              </span>
              {roleOption ? (
                <div className="character-role-bonus-rule">
                  <strong>{roleOption.label}</strong>
                  <p>{roleOption.description}</p>
                </div>
              ) : (
                <p className="stat-sheet-rule">
                  Für diese freie oder Modulrolle ist kein STA-2e-Standardbonus hinterlegt.
                </p>
              )}
              <label htmlFor={`${idPrefix}-roleBonusNotes`} className="stat-label-secondary">
                Zusätzliche Regelnotizen (optional)
              </label>
              <textarea
                id={`${idPrefix}-roleBonusNotes`}
                value={getAdditionalRoleBonusNotes(stats.characterRole, stats.specialRules).join("\n")}
                onChange={(event) => setList("specialRules", () => event.target.value.split("\n"))}
                rows={2}
                className="stat-field-input font-mono"
              />
              {roleBonusEntries.length > 0 && (
                <span className="lcars-text text-[13px]">Der Rollenbonus wird automatisch aus der gewählten Rolle übernommen.</span>
              )}
            </div>
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
          focuses={stats.focuses}
          // Während der Erschaffung kommen Talente aus dem Freikontingent —
          // kosten also nichts. Nach dem Festschreiben wird direkt hier mit
          // AP gesteigert.
          cost={locked ? rules.talentCost : null}
          affordable={
            !locked ||
            !advancement ||
            advancement.availableAp >= rules.talentCost
          }
          onPick={(entry) => {
            if (locked && advancement) {
              const payload = new FormData();
              payload.set("characterId", String(advancement.characterId));
              payload.set("kind", "talent");
              payload.set("entry", entry);
              advancement.submit(payload);
            } else {
              setList(CATALOG_LIST, (prev) => [...prev, entry]);
            }
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {adding === FOCUS_LIST && (
        <FocusModal
          focuses={focuses}
          taken={stats.focuses}
          // Während der Erschaffung kommen Schwerpunkte aus dem
          // Freikontingent — kosten also nichts. Gesteigert wird über das
          // direkt hier mit AP.
          cost={locked ? rules.focusCost : null}
          affordable={
            !locked ||
            !advancement ||
            advancement.availableAp >= rules.focusCost
          }
          onPick={(name) => {
            if (locked && advancement) {
              const payload = new FormData();
              payload.set("characterId", String(advancement.characterId));
              payload.set("kind", "focus");
              payload.set("entry", name);
              advancement.submit(payload);
            } else {
              setList(FOCUS_LIST, (prev) => [...prev, name]);
            }
            setAdding(null);
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {adding !== null && adding !== CATALOG_LIST && adding !== FOCUS_LIST && (
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
