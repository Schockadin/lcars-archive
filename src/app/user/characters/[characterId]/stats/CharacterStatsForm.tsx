"use client";
import { useActionState, useMemo, useState } from "react";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  ATTRIBUTE_RULE,
  DEPARTMENT_RULE,
  TEXT_FIELDS,
  LIST_FIELDS,
  EXPERIENCE_OPTIONS,
  validateDistribution,
  type NumberFieldSpec,
  type StatFieldSpec,
} from "@/lib/characterStats";
import {
  characterStatsAction,
  type CharacterStatsFormState,
} from "../../_shared/statsAction";
import type { Talent } from "@/lib/talentCatalog";
import TalentPicker from "../../_shared/TalentPicker";
import type { CharacterStats } from "@/types/characterStats";

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

// Beschriftung wie auf dem Bogen: der englische Originalbegriff groß, die
// deutsche Entsprechung klein darunter.
function StatLabel({ spec }: { spec: StatFieldSpec<string> }) {
  return (
    <>
      <span className="stat-label-primary">{spec.original ?? spec.label}</span>
      {spec.original && (
        <span className="stat-label-secondary">{spec.label}</span>
      )}
    </>
  );
}

// Abschnittsüberschrift im Stil der Kopfleisten des Bogens.
function SectionTitle({ en, de }: { en: string; de: string }) {
  return (
    <h2 className="stat-sheet-section-title">
      {en} <span className="stat-label-secondary">{de}</span>
    </h2>
  );
}

// Ein Wertekasten (Attribut/Disziplin) im Stil des Bogens: Beschriftungsleiste
// oben, große Zahl darunter.
function StatBox({
  spec,
  group,
  value,
  invalid,
  readOnly,
  onChange,
}: {
  spec: NumberFieldSpec<string>;
  group: "attributes" | "departments";
  value: string;
  invalid: boolean;
  // Nach dem Festschreiben der Erschaffung nur noch über AP steigerbar
  // (siehe AdvancementPanel.tsx) — das Feld wird dann schreibgeschützt.
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const id = `stats-${group}-${spec.key}`;
  return (
    <div className={`stat-box${invalid ? " stat-box--invalid" : ""}`}>
      <label className="stat-box-label" htmlFor={id}>
        <StatLabel spec={spec} />
      </label>
      <input
        id={id}
        name={`${group}.${spec.key}`}
        type="number"
        inputMode="numeric"
        min={spec.min}
        max={spec.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="stat-box-input"
        aria-invalid={invalid || undefined}
        readOnly={readOnly}
        title={readOnly ? "Nur noch über AP steigerbar" : undefined}
      />
    </div>
  );
}

// Charakterwerte-Formular, angelehnt an den offiziellen Bogen (STA 2e
// „personnel file"): Kopfdaten links, Attribute und Disziplinen als
// Wertekästen, die abgeleiteten Werte als Kästchenreihen und die Listenfelder
// als linierte Blöcke.
//
// Bewusst KEIN ContentEditor: der ist auf Markdown-Text + Entwurf +
// Autolinking zugeschnitten, was hier alles nicht zutrifft — die
// Action-Konventionen (useActionState, FormError als Toast) sind dieselben.
// Talent-Liste des Bogens: Auswahlfeld aus dem Katalog plus das gewohnte
// Textfeld mit einem Eintrag je Zeile. Der Katalog macht das Nachschlagen
// unnötig (Voraussetzung und Regeltext stehen direkt darunter), das Textfeld
// bleibt die Wahrheit — abgesendet wird immer sein Inhalt.
function TalentListField({
  talents,
  stats,
  species,
  initial,
  readOnly,
  label,
}: {
  talents: Talent[];
  // Live-Werte des Bogens — die Auswahl blendet damit Talente aus, deren
  // Voraussetzungen (noch) nicht erfüllt sind.
  stats: CharacterStats;
  species: string | null;
  initial: string[];
  readOnly: boolean;
  label: string;
}) {
  const [text, setText] = useState(initial.join("\n"));
  const [picked, setPicked] = useState("");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  function addPicked() {
    if (!picked) return;
    setText(lines.length > 0 ? `${lines.join("\n")}\n${picked}` : picked);
    setPicked("");
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <textarea
        id="stats-talents"
        name="talents"
        // Nach der Ersterschaffung kosten Talente AP und kommen nur noch über
        // das Advancement-Panel hinzu.
        readOnly={readOnly}
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={label}
        className="stat-list-input"
      />
      {!readOnly && talents.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          <TalentPicker
            talents={talents}
            stats={stats}
            species={species}
            value={picked}
            onChange={setPicked}
            label="Aus dem Katalog übernehmen"
            taken={lines}
          />
          <button
            type="button"
            onClick={addPicked}
            disabled={!picked}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
          >
            Übernehmen
          </button>
        </div>
      )}
    </div>
  );
}

export default function CharacterStatsForm({
  userId,
  characterId,
  characterName,
  portrait,
  stats,
  savedStats,
  talents,
  species,
  attributes,
  setAttributes,
  departments,
  setDepartments,
}: {
  userId: number;
  characterId: number;
  characterName: string;
  // Portrait des Charakters = „Photo" des Bogens (siehe OwnCharacterStats).
  portrait: string | null;
  // Die LIVE mitgeführten Werte (siehe CharacterSheet) — Grundlage der
  // Talent-Auswahl, die Voraussetzungen gegen die aktuellen Zahlen prüft.
  stats: CharacterStats;
  // Der zuletzt GESPEICHERTE Stand — er füllt die Felder vor, die dieses
  // Formular selbst hält (Listen, Freitexte).
  savedStats: CharacterStats;
  // Talent-Katalog für die Auswahlliste (gepflegt unter /gm/talents).
  talents: Talent[];
  // Spezies der Akte — für Voraussetzungen wie „Vulcan".
  species: string | null;
  // Attribute und Disziplinen liegen als State eine Ebene höher
  // (CharacterSheet.tsx): der AP-Bereich rechnet damit live mit, während hier
  // getippt wird. Beide Blöcke bleiben Strings — ein leeres Feld ist „nicht
  // gepflegt", nicht 0.
  attributes: NumberInputs;
  setAttributes: React.Dispatch<React.SetStateAction<NumberInputs>>;
  departments: NumberInputs;
  setDepartments: React.Dispatch<React.SetStateAction<NumberInputs>>;
}) {
  const [state, formAction, pending] = useActionState(
    characterStatsAction,
    initialState,
  );

  const [stressBonus, setStressBonus] = useState(
    stats.stressBonus?.toString() ?? "",
  );
  const [determination, setDetermination] = useState(stats.determination ?? 0);

  const attributeValues = toNumbers(ATTRIBUTE_FIELDS, attributes);
  const departmentValues = toNumbers(DEPARTMENT_FIELDS, departments);

  // Regelverstöße live anzeigen — verbindlich geprüft wird trotzdem in der
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
  function overfilledValues(
    values: (number | null)[],
    rule: typeof ATTRIBUTE_RULE,
  ): Set<number> {
    const over = new Set<number>();
    const atMax = values.filter((v) => v === rule.max).length;
    if (atMax > rule.maxAtMax) over.add(rule.max);
    const atSecond = values.filter((v) => v === rule.max - 1).length;
    if (atSecond > rule.maxAtSecond) over.add(rule.max - 1);
    return over;
  }

  const attributeOverfilled = overfilledValues(attributeValues, ATTRIBUTE_RULE);
  const departmentOverfilled = overfilledValues(
    departmentValues,
    DEPARTMENT_RULE,
  );

  function isOutOfRange(raw: string, rule: typeof ATTRIBUTE_RULE): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const value = Number(trimmed);
    return !Number.isInteger(value) || value < rule.min || value > rule.max;
  }

  // Maximaler Stress = Fitness + Bonus aus Talenten (siehe computeStress).
  const fitness = attributes.fitness?.trim()
    ? Number(attributes.fitness)
    : null;
  const bonus = stressBonus.trim() ? Number(stressBonus) : 0;
  const stress =
    fitness !== null && Number.isInteger(fitness)
      ? fitness + (Number.isInteger(bonus) ? bonus : 0)
      : null;

  return (
    <form action={formAction} className="stat-sheet">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="determination" value={determination} />

      {/* ── Kopfdaten mit Foto ────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Personnel File" de="Personalakte" />

        <div className="stat-photo-row">
          {/* Foto-Kasten wie oben links auf dem Bogen. Gepflegt wird das
              Portrait des Charakters — dasselbe Bild wie im Kopf-Formular,
              kein zweites daneben. */}
          <div className="stat-photo">
            {portrait ? (
              // Bewusst <img> statt next/image: die Portraits liegen im
              // öffentlichen Asset-Bucket unter beliebigen Hosts, für die
              // next/image eine Domain-Freigabe bräuchte.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portrait}
                alt={`Portrait von ${characterName}`}
                className="stat-photo-image"
              />
            ) : (
              <span className="stat-photo-empty">Photo</span>
            )}
            <label className="stat-photo-upload" htmlFor="stats-portraitFile">
              <span className="stat-label-primary">Photo</span>
              <span className="stat-label-secondary">
                {portrait ? "Bild ersetzen" : "Bild hochladen"}
              </span>
              <input
                id="stats-portraitFile"
                name="portraitFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="stat-photo-input"
              />
            </label>
          </div>

          <div className="stat-grid stat-grid--head">
          {TEXT_FIELDS.map((field) => (
            <div key={field.key} className="stat-field">
              <label className="stat-field-label" htmlFor={`stats-${field.key}`}>
                <StatLabel spec={field} />
              </label>
              <input
                id={`stats-${field.key}`}
                name={field.key}
                type="text"
                defaultValue={stats[field.key] ?? ""}
                className="stat-field-input"
              />
            </div>
          ))}

          <div className="stat-field">
            <label className="stat-field-label" htmlFor="stats-experience">
              <span className="stat-label-primary">Experience</span>
              <span className="stat-label-secondary">Erfahrung</span>
            </label>
            <select
              id="stats-experience"
              name="experience"
              defaultValue={stats.experience ?? ""}
              className="stat-field-input"
            >
              <option value="">—</option>
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

      {/* ── Attribute + Disziplinen nebeneinander, wie auf dem Bogen ── */}
      <div className="stat-columns">
      <section className="stat-sheet-section">
        <SectionTitle en="Attributes" de="Attribute" />
        <p className="stat-sheet-rule">
          {ATTRIBUTE_RULE.min}–{ATTRIBUTE_RULE.max}, davon höchstens{" "}
          {ATTRIBUTE_RULE.maxAtMax}× {ATTRIBUTE_RULE.max} und{" "}
          {ATTRIBUTE_RULE.maxAtSecond}× {ATTRIBUTE_RULE.max - 1}.
        </p>
        <div className="stat-box-row">
          {ATTRIBUTE_FIELDS.map((field, index) => (
            <StatBox
              key={field.key}
              spec={field}
              group="attributes"
              value={attributes[field.key] ?? ""}
              invalid={
                isOutOfRange(attributes[field.key] ?? "", ATTRIBUTE_RULE) ||
                attributeOverfilled.has(attributeValues[index] ?? -1)
              }
              readOnly={stats.creationLocked}
              onChange={(value) =>
                setAttributes((prev) => ({ ...prev, [field.key]: value }))
              }
            />
          ))}
        </div>
      </section>

      <section className="stat-sheet-section">
        <SectionTitle en="Departments" de="Disziplinen" />
        <p className="stat-sheet-rule">
          {DEPARTMENT_RULE.min}–{DEPARTMENT_RULE.max}, davon höchstens{" "}
          {DEPARTMENT_RULE.maxAtMax}× {DEPARTMENT_RULE.max} und{" "}
          {DEPARTMENT_RULE.maxAtSecond}× {DEPARTMENT_RULE.max - 1}.
        </p>
        <div className="stat-box-row">
          {DEPARTMENT_FIELDS.map((field, index) => (
            <StatBox
              key={field.key}
              spec={field}
              group="departments"
              value={departments[field.key] ?? ""}
              invalid={
                isOutOfRange(departments[field.key] ?? "", DEPARTMENT_RULE) ||
                departmentOverfilled.has(departmentValues[index] ?? -1)
              }
              readOnly={stats.creationLocked}
              onChange={(value) =>
                setDepartments((prev) => ({ ...prev, [field.key]: value }))
              }
            />
          ))}
        </div>
      </section>
      </div>

      {ruleErrors.length > 0 && (
        <ul className="stat-sheet-errors">
          {ruleErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {/* ── Abgeleitete Werte ─────────────────────────────────────── */}
      <section className="stat-sheet-section">
        <SectionTitle en="Stress, Determination &amp; Reputation" de="Werte im Spiel" />
        <div className="stat-derived">
          <div className="stat-derived-block">
            <span className="stat-field-label">
              <span className="stat-label-primary">Stress</span>
              <span className="stat-label-secondary">Fitness + Talente</span>
            </span>
            <div className="stat-stress">
              <span className="stat-stress-value">{stress ?? "—"}</span>
              {/* Kästchenreihe wie auf dem Bogen — rein visuell, der Wert
                  selbst wird berechnet und nicht gespeichert. */}
              <span className="stat-stress-boxes" aria-hidden="true">
                {Array.from({ length: Math.min(stress ?? 0, 30) }).map(
                  (_, index) => (
                    <span key={index} className="stat-stress-box" />
                  ),
                )}
              </span>
            </div>
          </div>

          <div className="stat-derived-block">
            <label className="stat-field-label" htmlFor="stats-stressBonus">
              <span className="stat-label-primary">Talent bonus</span>
              <span className="stat-label-secondary">Bonus aus Talenten, z.B. „Resolut: +3 max. Stress“</span>
            </label>
            <input
              id="stats-stressBonus"
              name="stressBonus"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={stressBonus}
              onChange={(e) => setStressBonus(e.target.value)}
              className="stat-field-input"
            />
          </div>

          <div className="stat-derived-block">
            <span className="stat-field-label">
              <span className="stat-label-primary">Determination</span>
              <span className="stat-label-secondary">Entschlossenheit</span>
            </span>
            {/* Drei Kästchen wie auf dem Bogen: Klick füllt bis dahin auf,
                erneuter Klick aufs letzte gefüllte leert es wieder. */}
            <div className="stat-determination">
              {[1, 2, 3].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={determination >= slot}
                  aria-label={`Entschlossenheit ${slot}`}
                  className={`stat-det-box${determination >= slot ? " stat-det-box--filled" : ""}`}
                  onClick={() =>
                    setDetermination(determination === slot ? slot - 1 : slot)
                  }
                />
              ))}
            </div>
          </div>

          <div className="stat-derived-block">
            <label className="stat-field-label" htmlFor="stats-resistance">
              <span className="stat-label-primary">Protection</span>
              <span className="stat-label-secondary">Schutz</span>
            </label>
            <input
              id="stats-resistance"
              name="resistance"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              defaultValue={stats.resistance ?? ""}
              className="stat-field-input"
            />
          </div>

          <div className="stat-derived-block">
            <label className="stat-field-label" htmlFor="stats-reputation">
              <span className="stat-label-primary">Reputation</span>
              <span className="stat-label-secondary">Ansehen</span>
            </label>
            <input
              id="stats-reputation"
              name="reputation"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              defaultValue={stats.reputation ?? ""}
              className="stat-field-input"
            />
          </div>
        </div>
      </section>

      {/* ── Listenfelder ──────────────────────────────────────────── */}
      <div className="stat-list-grid">
        {LIST_FIELDS.map((field) => (
          <section key={field.key} className="stat-sheet-section stat-list-field">
            <h2 className="stat-sheet-section-title">
              {field.original ?? field.label}{" "}
              {field.original && (
                <span className="stat-label-secondary">{field.label}</span>
              )}
            </h2>
            {field.key === "talents" ? (
              // Talente kommen aus dem Katalog (/gm/talents): das Auswahlfeld
              // hängt den Namen an die Liste an, die Liste selbst bleibt ein
              // Textfeld — so lassen sich Einträge auch wieder streichen und
              // Sonderfälle von Hand eintragen.
              <TalentListField
                talents={talents}
                stats={stats}
                species={species}
                initial={savedStats.talents}
                readOnly={stats.creationLocked}
                label={field.label}
              />
            ) : (
              <textarea
                id={`stats-${field.key}`}
                name={field.key}
                // Schwerpunkte kosten nach der Erschaffung AP und werden dann
                // nur noch über das Advancement-Panel ergänzt.
                readOnly={stats.creationLocked && field.key === "focuses"}
                // Mindestens acht Zeilen ohne Scrollen — die Listen des Bogens
                // (Werte, Schwerpunkte, Talente, …) haben dort ebenfalls
                // reichlich Platz.
                rows={8}
                defaultValue={stats[field.key].join("\n")}
                aria-label={field.label}
                className="stat-list-input"
              />
            )}
          </section>
        ))}
      </div>

      <SubmitButton pending={pending} pendingLabel="Speichert …">
        Werte speichern
      </SubmitButton>

      <FormError message={state?.error} />
    </form>
  );
}
