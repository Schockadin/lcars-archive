"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { ATTRIBUTE_FIELDS, EXPERIENCE_OPTIONS } from "@/lib/characterStats";
import { FocusModal } from "./FocusPicker";
import { TalentModal } from "./TalentPicker";
import type { Focus } from "@/lib/focusCatalog";
import type { Talent } from "@/lib/talentCatalog";
import type { CharacterStats, LifepathCareerEvent } from "@/types/characterStats";
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  CAREER_PATH_OPTIONS,
  DEPARTMENT_KEYS,
  DEPARTMENT_LABELS,
  EMPTY_STA2E_LIFEPATH,
  ENVIRONMENT_OPTIONS,
  UPBRINGING_OPTIONS,
  applySta2eLifepath,
  careerEventAttributeChoices,
  careerEventDepartmentChoices,
  lifepathReallocationChoices,
  newLifepathEvent,
  type AttributeKey,
  type DepartmentKey,
} from "@/lib/sta2eLifepath";
import { rollCareerEvent, STA2E_CAREER_EVENTS } from "@/lib/sta2eCareerEvents";
import { findRoleOption } from "@/lib/sta2eCharacterOptions";
import { CharacterField, CharacterSelectInput, CharacterTextInput } from "./CharacterFormControls";

type TalentSlot = "upbringing" | "career" | "experience" | "finishing";
type FocusSlot = { kind: "upbringing" } | { kind: "career"; index: number } | { kind: "event"; index: number } | { kind: "role"; index: number };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <CharacterField label={label} secondary={hint}>{children}</CharacterField>;
}

function TextInput({ value, onChange, placeholder = "" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <CharacterTextInput value={value} onChange={onChange} placeholder={placeholder} />;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "— auswählen —",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <CharacterSelectInput value={value} onChange={onChange} options={options} placeholder={placeholder} />
    </Field>
  );
}

function ChoiceInput({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const listId = `lifepath-focus-${useId()}`;
  return (
    <>
      <CharacterTextInput list={listId} value={value} placeholder={placeholder} disabled={disabled} onChange={onChange} />
      <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </>
  );
}

function SingleKeyChoice<K extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: K | null;
  options: readonly K[];
  labels: Record<K, string>;
  onChange: (value: K | null) => void;
}) {
  return (
    <SelectField
      label={label}
      value={value ?? ""}
      options={options.map((key) => ({ value: key, label: labels[key] }))}
      onChange={(next) => onChange((options as readonly string[]).includes(next) ? next as K : null)}
    />
  );
}

function MultiIncrementChoices<K extends string>({
  label,
  count,
  values,
  options,
  labels,
  onChange,
  distinct = false,
  maxPerValue,
}: {
  label: string;
  count: number;
  values: K[];
  options: readonly K[];
  labels: Record<K, string>;
  onChange: (values: K[]) => void;
  distinct?: boolean;
  maxPerValue?: number;
}) {
  return (
    <div className="stat-editor-grid">
      {Array.from({ length: count }, (_, index) => (
        <SelectField
          key={index}
          label={`${label} ${index + 1}`}
          value={values[index] ?? ""}
          options={options
            .filter((key) =>
              key === values[index] ||
              (distinct ? !values.includes(key) : !maxPerValue || values.filter((value) => value === key).length < maxPerValue),
            )
            .map((key) => ({ value: key, label: labels[key] }))}
          onChange={(value) => {
            const next = [...values];
            if (value) next[index] = value as K;
            else next.splice(index, 1);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export default function Sta2eLifepathBuilder({
  stats,
  onChange,
  species,
  talents,
  focuses,
  readOnly = false,
}: {
  stats: CharacterStats;
  onChange: (stats: CharacterStats) => void;
  species: string[];
  talents: Talent[];
  focuses: Focus[];
  readOnly?: boolean;
}) {
  const [talentSlot, setTalentSlot] = useState<TalentSlot | null>(null);
  const [focusSlot, setFocusSlot] = useState<FocusSlot | null>(null);
  const [correctionKind, setCorrectionKind] = useState<"attribute" | "department">("attribute");
  const [correctionFrom, setCorrectionFrom] = useState("");
  const [correctionTo, setCorrectionTo] = useState("");
  const lp = stats.lifepath ?? EMPTY_STA2E_LIFEPATH;

  const focusNames = useMemo(() => [...new Set(focuses.map((focus) => focus.name))].sort((a, b) => a.localeCompare(b, "de")), [focuses]);
  const events = lp.careerEvents;
  const role = findRoleOption(stats.characterRole);
  const denobulanAbility = stats.speciesAbilities.some((entry) => /denobulan.*breadth of study/i.test(entry));
  const roleFocusCount = role?.id === "expert" ? 1 : role?.id === "ships-doctor" ? 2 : 0;
  const extraFocusCount = roleFocusCount + (denobulanAbility ? 2 : 0);
  const usedTalent = talentSlot ? talentSlot === "upbringing" ? lp.upbringing.talent : talentSlot === "career" ? lp.career.talent : talentSlot === "experience" ? lp.experience.talent : lp.finishing.talent : "";
  const takenTalents = usedTalent ? stats.talents.filter((entry) => entry !== usedTalent) : stats.talents;
  const currentFocus = focusSlot
    ? focusSlot.kind === "upbringing" ? lp.upbringing.focus
      : focusSlot.kind === "career" ? lp.career.focuses[focusSlot.index] ?? ""
        : focusSlot.kind === "event" ? lp.careerEvents[focusSlot.index]?.focus ?? ""
          : lp.roleBonus.focuses[focusSlot.index] ?? ""
    : "";
  const takenFocuses = currentFocus ? stats.focuses.filter((entry) => entry !== currentFocus) : stats.focuses;

  function emit(next: CharacterStats) {
    onChange(applySta2eLifepath(next, species));
  }

  function patchLifepath(patch: Partial<typeof lp>) {
    emit({ ...stats, creationMethod: "sta2e-lifepath", lifepath: { ...lp, ...patch } });
  }

  function updateSection<K extends keyof typeof lp>(key: K, update: (section: typeof lp[K]) => typeof lp[K]) {
    patchLifepath({ [key]: update(lp[key]) } as Partial<typeof lp>);
  }

  function setTalent(slot: TalentSlot, value: string) {
    if (slot === "upbringing") updateSection("upbringing", (section) => ({ ...section, talent: value }));
    else if (slot === "career") updateSection("career", (section) => ({ ...section, talent: value }));
    else if (slot === "experience") updateSection("experience", (section) => ({ ...section, talent: value }));
    else updateSection("finishing", (section) => ({ ...section, talent: value }));
  }

  function setFocus(slot: FocusSlot, value: string) {
    if (slot.kind === "upbringing") updateSection("upbringing", (section) => ({ ...section, focus: value }));
    else if (slot.kind === "career") updateSection("career", (section) => {
      const next = [...section.focuses]; next[slot.index] = value; return { ...section, focuses: next };
    });
    else if (slot.kind === "event") updateSection("careerEvents", (current) => current.map((event, index) => index === slot.index ? { ...event, focus: value } : event));
    else updateSection("roleBonus", (section) => {
      const next = [...section.focuses]; next[slot.index] = value; return { ...section, focuses: next };
    });
  }

  function updateEvent(index: number, patch: Partial<LifepathCareerEvent>) {
    updateSection("careerEvents", (current) => current.map((event, itemIndex) => itemIndex === index ? { ...event, ...patch } : event));
  }

  function chooseEvent(index: number, id: string) {
    const next = Array.from({ length: Math.max(events.length, index + 1) }, (_, itemIndex) => events[itemIndex] ?? newLifepathEvent());
    const event = STA2E_CAREER_EVENTS.find((entry) => entry.id === id);
    next[index] = event
      ? { ...newLifepathEvent(), id, attribute: event.attribute === "any" ? null : event.attribute, department: event.department === "any" ? null : event.department, attributeBonus: index < 2, departmentBonus: index < 2, focusBonus: index < 2 }
      : newLifepathEvent();
    if (!id) next.splice(index, 1);
    updateSection("careerEvents", () => next);
  }

  const environment = ENVIRONMENT_OPTIONS.find((option) => option.id === lp.environment.choice);
  const upbringing = UPBRINGING_OPTIONS.find((option) => option.id === lp.upbringing.choice);
  const career = CAREER_PATH_OPTIONS.find((option) => option.id === lp.career.path);
  const track = career?.tracks?.find((option) => option.id === lp.career.track);
  const careerMajorOptions = track?.majors ?? career?.majors ?? [];
  const careerReallocationDepartments = [lp.career.majorDepartment, ...lp.career.minorDepartments]
    .filter((key): key is DepartmentKey => key !== null);
  const careerAttributeChoices = lp.career.attributes;
  const validEnvironmentAttributes = environment?.id === "homeworld"
    ? lp.speciesAttributes
    : environment?.id === "frontier-colony"
      ? lp.environment.otherSpeciesAttributes
      : environment?.attributes ?? ATTRIBUTE_KEYS;
  const correctionChoices = lifepathReallocationChoices(stats, correctionKind);
  const correctionLabels = correctionKind === "attribute" ? ATTRIBUTE_LABELS : DEPARTMENT_LABELS;

  function setCareerPath(id: string) {
    const selected = CAREER_PATH_OPTIONS.find((option) => option.id === id);
    updateSection("career", (section) => ({
      ...section,
      path: id || null,
      track: selected?.tracks?.[0]?.id ?? null,
      majorDepartment: null,
      minorDepartments: [],
      attributes: [],
      reallocation: null,
      trait: selected?.trait ?? "",
      value: "",
      focuses: [],
      talent: "",
    }));
  }

  function toggleSpeciesAttribute(key: AttributeKey, checked: boolean) {
    const next = checked
      ? [...lp.speciesAttributes, key].slice(0, 3)
      : lp.speciesAttributes.filter((entry) => entry !== key);
    patchLifepath({ speciesAttributes: next });
  }

  function addCorrection() {
    if (!correctionFrom || !correctionTo || correctionFrom === correctionTo) return;
    const next = [...lp.corrections, { kind: correctionKind, from: correctionFrom, to: correctionTo }];
    patchLifepath({ corrections: next });
    setCorrectionFrom(""); setCorrectionTo("");
  }

  function talentModalTarget(slot: TalentSlot) {
    setTalentSlot(slot);
  }

  function toggleEventBenefit(index: number, key: "attributeBonus" | "departmentBonus" | "focusBonus", checked: boolean) {
    const selected = events.filter((event) => event.id && event[key]).length;
    if (checked && selected >= 2) return;
    updateEvent(index, { [key]: checked });
  }

  return (
    <section className="stat-editor-section flex flex-col gap-[16px]">
      <header>
        <h3 className="stat-editor-section-title">STA 2e Lifepath</h3>
        <p className="stat-sheet-rule">Die sieben Schritte berechnen Attribute, Disziplinen, Werte, Schwerpunkte, Talente und Traits. Am Ende müssen 56 Attributspunkte und 16 Disziplinpunkte verteilt sein. Überschreitungen werden in Schritt 7 umverteilt.</p>
      </header>

      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-[16px] border-0 p-0">

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">1 · Species / Spezies</h4>
        <p className="stat-sheet-rule">Alle Werte beginnen bei Attribut 7 und Disziplin 1. Wähle die drei Attribute, die durch deine Spezies jeweils +1 erhalten. Spezies und Species Abilities werden im Tab „Werte“ gewählt.</p>
        <div className="stat-editor-grid">
          {ATTRIBUTE_FIELDS.map((field) => (
            <label key={field.key} className="character-ability-option">
              <input type="checkbox" disabled={readOnly || (!lp.speciesAttributes.includes(field.key) && lp.speciesAttributes.length >= 3)} checked={lp.speciesAttributes.includes(field.key)} onChange={(event) => toggleSpeciesAttribute(field.key, event.currentTarget.checked)} />
              <span><strong>{field.original}</strong></span>
            </label>
          ))}
        </div>
      </section>

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">2 · Environment / Herkunft</h4>
        <div className="stat-editor-grid">
          <SelectField label="Herkunft" value={lp.environment.choice ?? ""} options={ENVIRONMENT_OPTIONS.map((option) => ({ value: option.id, label: `${option.label} (${option.name})` }))} onChange={(choice) => updateSection("environment", (section) => ({ ...section, choice: choice || null, attribute: null, department: null, otherSpecies: "", otherSpeciesAttributes: [] }))} />
          <Field label="Wert"><TextInput value={lp.environment.value} onChange={(value) => updateSection("environment", (section) => ({ ...section, value }))} placeholder="Ein prägender Grundsatz" /></Field>
          {environment?.id === "frontier-colony" && <>
            <Field label="Andere Spezies"><TextInput value={lp.environment.otherSpecies} onChange={(otherSpecies) => updateSection("environment", (section) => ({ ...section, otherSpecies, otherSpeciesAttributes: [] }))} placeholder="Spezies der Kolonie" /></Field>
            <fieldset className="stat-editor-field"><legend className="stat-field-label">Drei Attribute dieser Spezies</legend><div className="stat-editor-grid">{ATTRIBUTE_FIELDS.map((field) => <label key={field.key} className="character-ability-option"><input type="checkbox" disabled={readOnly || (!lp.environment.otherSpeciesAttributes.includes(field.key) && lp.environment.otherSpeciesAttributes.length >= 3)} checked={lp.environment.otherSpeciesAttributes.includes(field.key)} onChange={(event) => updateSection("environment", (section) => ({ ...section, otherSpeciesAttributes: event.currentTarget.checked ? [...section.otherSpeciesAttributes, field.key].slice(0, 3) : section.otherSpeciesAttributes.filter((key) => key !== field.key), attribute: null }))} /><span>{field.original}</span></label>)}</div></fieldset>
          </>}
          <SingleKeyChoice label="Attribut +1" value={lp.environment.attribute} options={validEnvironmentAttributes as AttributeKey[]} labels={ATTRIBUTE_LABELS} onChange={(attribute) => updateSection("environment", (section) => ({ ...section, attribute }))} />
          <SingleKeyChoice label="Disziplin +1" value={lp.environment.department} options={(environment?.departments ?? DEPARTMENT_KEYS) as DepartmentKey[]} labels={DEPARTMENT_LABELS} onChange={(department) => updateSection("environment", (section) => ({ ...section, department }))} />
        </div>
      </section>

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">3 · Upbringing / Erziehung</h4>
        <div className="stat-editor-grid">
          <SelectField label="Erziehung" value={lp.upbringing.choice ?? ""} options={UPBRINGING_OPTIONS.map((option) => ({ value: option.id, label: option.name }))} onChange={(choice) => updateSection("upbringing", (section) => ({ ...section, choice: choice || null, accepted: null, department: null, focus: "", talent: "" }))} />
          <SelectField label="Haltung zur Erziehung" value={lp.upbringing.accepted === null ? "" : lp.upbringing.accepted ? "accepted" : "rebelled"} options={[{ value: "accepted", label: "Angenommen" }, { value: "rebelled", label: "Abgelehnt" }]} onChange={(value) => updateSection("upbringing", (section) => ({ ...section, accepted: value === "accepted" ? true : value === "rebelled" ? false : null }))} />
          <SingleKeyChoice label="Disziplin +1" value={lp.upbringing.department} options={upbringing?.departments ?? []} labels={DEPARTMENT_LABELS} onChange={(department) => updateSection("upbringing", (section) => ({ ...section, department }))} />
          <Field label="Schwerpunkt"><div className="flex gap-[8px]"><ChoiceInput value={lp.upbringing.focus} options={focusNames} placeholder="Schwerpunkt" onChange={(focus) => updateSection("upbringing", (section) => ({ ...section, focus }))} /><button type="button" className="lcars-pill-btn--outline" onClick={() => setFocusSlot({ kind: "upbringing" })}>Katalog</button></div></Field>
          <Field label="Talent"><div className="flex gap-[8px]"><span className="stat-field-input flex-1">{lp.upbringing.talent || "Noch nicht gewählt"}</span><button type="button" disabled={readOnly} className="lcars-pill-btn--outline" onClick={() => talentModalTarget("upbringing")}>Talent wählen</button></div></Field>
        </div>
        {upbringing && lp.upbringing.accepted !== null && <p className="stat-sheet-rule">Attributsboni: {(lp.upbringing.accepted ? upbringing.accepted : upbringing.rebelled).map((key) => ATTRIBUTE_LABELS[key]).join(" +1 ")}.</p>}
      </section>

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">4 · Career Path / Laufbahn</h4>
        <div className="stat-editor-grid">
          <SelectField label="Karriereweg" value={lp.career.path ?? ""} options={CAREER_PATH_OPTIONS.map((option) => ({ value: option.id, label: option.name }))} onChange={setCareerPath} />
          {career?.tracks && <SelectField label="Akademie-Track" value={lp.career.track ?? ""} options={career.tracks.map((option) => ({ value: option.id, label: option.name }))} onChange={(trackId) => updateSection("career", (section) => ({ ...section, track: trackId || null, majorDepartment: null, minorDepartments: [], reallocation: null }))} />}
          <Field label="Trait"><TextInput value={lp.career.trait} onChange={(trait) => updateSection("career", (section) => ({ ...section, trait }))} /></Field>
          <Field label="Wert"><TextInput value={lp.career.value} onChange={(value) => updateSection("career", (section) => ({ ...section, value }))} placeholder="Ein Grundsatz aus der Laufbahn" /></Field>
        </div>
        <MultiIncrementChoices label="Attribut +1" count={3} values={careerAttributeChoices} options={ATTRIBUTE_KEYS} labels={ATTRIBUTE_LABELS} onChange={(attributes) => updateSection("career", (section) => ({ ...section, attributes }))} maxPerValue={2} />
        {career?.attributeRequirement && <p className="stat-sheet-rule">Mindestens ein Punkt muss in {ATTRIBUTE_LABELS[career.attributeRequirement]} gehen.</p>}
        {career?.attributeRequirementAny && <p className="stat-sheet-rule">Mindestens ein Punkt muss in {career.attributeRequirementAny.map((key) => ATTRIBUTE_LABELS[key]).join(" oder ")} gehen.</p>}
        {career?.id === "starfleet-enlisted" ? <p className="stat-sheet-rule">Feste Disziplinboni: Conn +1, Security +2, Engineering +1.</p> : <div className="stat-editor-grid">
          <SingleKeyChoice label="Hauptdisziplin +2" value={lp.career.majorDepartment} options={careerMajorOptions} labels={DEPARTMENT_LABELS} onChange={(majorDepartment) => updateSection("career", (section) => ({ ...section, majorDepartment, minorDepartments: section.minorDepartments.filter((key) => key !== majorDepartment), reallocation: null }))} />
          <MultiIncrementChoices label="Nebendisziplin +1" count={2} values={lp.career.minorDepartments} options={DEPARTMENT_KEYS.filter((key) => key !== lp.career.majorDepartment)} labels={DEPARTMENT_LABELS} onChange={(minorDepartments) => updateSection("career", (section) => ({ ...section, minorDepartments, reallocation: null }))} distinct />
        </div>}
        {career?.reallocation && <div className="stat-editor-grid">
          <SelectField label="Optional: Disziplin absenken" value={lp.career.reallocation?.from ?? ""} options={careerReallocationDepartments.map((key) => ({ value: key, label: DEPARTMENT_LABELS[key] }))} onChange={(from) => updateSection("career", (section) => ({ ...section, reallocation: from && section.reallocation?.to ? { from: from as DepartmentKey, to: section.reallocation.to } : null }))} />
          <SelectField label="Punkt in unberührte Disziplin verschieben" value={lp.career.reallocation?.to ?? ""} options={DEPARTMENT_KEYS.filter((key) => !careerReallocationDepartments.includes(key)).map((key) => ({ value: key, label: DEPARTMENT_LABELS[key] }))} onChange={(to) => updateSection("career", (section) => ({ ...section, reallocation: to && section.reallocation?.from ? { from: section.reallocation.from, to: to as DepartmentKey } : null }))} />
        </div>}
        <div className="stat-editor-grid">
          {Array.from({ length: 3 }, (_, index) => <Field key={index} label={`Schwerpunkt ${index + 1}`}><div className="flex gap-[8px]"><ChoiceInput value={lp.career.focuses[index] ?? ""} options={focusNames} placeholder="Schwerpunkt" onChange={(focus) => updateSection("career", (section) => { const next = [...section.focuses]; next[index] = focus; return { ...section, focuses: next }; })} /><button type="button" className="lcars-pill-btn--outline" onClick={() => setFocusSlot({ kind: "career", index })}>Katalog</button></div></Field>)}
          <Field label="Talent"><div className="flex gap-[8px]"><span className="stat-field-input flex-1">{lp.career.talent || "Noch nicht gewählt"}</span><button type="button" disabled={readOnly} className="lcars-pill-btn--outline" onClick={() => talentModalTarget("career")}>Talent wählen</button></div></Field>
        </div>
      </section>

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">5 · Experience / Erfahrung</h4>
        <div className="stat-editor-grid">
          <SelectField label="Erfahrungsstufe" value={lp.experience.value ?? ""} options={EXPERIENCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} onChange={(value) => updateSection("experience", (section) => ({ ...section, value: (value || null) as typeof section.value, statement: "", talent: "", noviceAttribute: null }))} />
          <Field label="Wert"><TextInput value={lp.experience.statement} onChange={(statement) => updateSection("experience", (section) => ({ ...section, statement }))} placeholder="Ein Satz, der diese Erfahrung ausdrückt" /></Field>
          {lp.experience.value === "novice" && <SingleKeyChoice label="Untapped Potential: Attribut" value={lp.experience.noviceAttribute} options={ATTRIBUTE_KEYS} labels={ATTRIBUTE_LABELS} onChange={(noviceAttribute) => updateSection("experience", (section) => ({ ...section, noviceAttribute }))} />}
          {lp.experience.value === "experienced" && <Field label="Talent"><div className="flex gap-[8px]"><span className="stat-field-input flex-1">{lp.experience.talent || "Noch nicht gewählt"}</span><button type="button" disabled={readOnly} className="lcars-pill-btn--outline" onClick={() => talentModalTarget("experience")}>Talent wählen</button></div></Field>}
          {lp.experience.value === "novice" && <p className="stat-sheet-rule">Untapped Potential begrenzt Attribute auf 11 und Disziplinen auf 4. Dieser Lifepath erzwingt die Begrenzung auch bei den Schlusswerten.</p>}
          {lp.experience.value === "veteran" && <p className="stat-sheet-rule">Veteran ist das feste Talent. Bei militärischer Laufbahn ist mindestens Lieutenant Commander oder Chief Petty Officer erforderlich.</p>}
        </div>
      </section>

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">6 · Career Events / Karriereereignisse</h4>
        <p className="stat-sheet-rule">Wähle zwei Ereignisse. Jedes gewährt +1 Attribut, +1 Disziplin und einen passenden Schwerpunkt; optionale Traits können ergänzt werden.</p>
        <div className="stat-editor-grid">
          {Array.from({ length: Math.max(2, events.length) }, (_, index) => {
            const selection = events[index] ?? newLifepathEvent();
            const event = STA2E_CAREER_EVENTS.find((entry) => entry.id === selection.id);
            const attributeOptions = careerEventAttributeChoices(selection.id);
            const departmentOptions = careerEventDepartmentChoices(selection.id);
            return <div key={index} className="stat-editor-field">
              <span className="stat-field-label"><span className="stat-label-primary">Career Event {index + 1}</span></span>
              <div className="flex gap-[8px]">
                <CharacterSelectInput className="flex-1" value={selection.id} onChange={(value) => chooseEvent(index, value)} placeholder="— Ereignis wählen —" options={STA2E_CAREER_EVENTS.map((entry) => ({ value: entry.id, label: `${entry.roll}. ${entry.title}` }))} />
                <button type="button" className="lcars-pill-btn--outline" onClick={() => chooseEvent(index, rollCareerEvent().id)}>W20</button>
              </div>
              {index >= 2 && <button type="button" className="lcars-pill-btn--outline mt-[8px]" onClick={() => chooseEvent(index, "")}>Ereignis entfernen</button>}
              {event && <div className="character-role-bonus-rule mt-[8px]">
                <p>{event.summary}</p>
                <div className="stat-editor-grid mt-[8px]">
                  <label className="character-ability-option"><input type="checkbox" checked={selection.attributeBonus} disabled={!selection.attributeBonus && events.filter((entry) => entry.id && entry.attributeBonus).length >= 2} onChange={(change) => toggleEventBenefit(index, "attributeBonus", change.currentTarget.checked)} /><span>Attributbonus verwenden</span></label>
                  <label className="character-ability-option"><input type="checkbox" checked={selection.departmentBonus} disabled={!selection.departmentBonus && events.filter((entry) => entry.id && entry.departmentBonus).length >= 2} onChange={(change) => toggleEventBenefit(index, "departmentBonus", change.currentTarget.checked)} /><span>Disziplinbonus verwenden</span></label>
                  <label className="character-ability-option"><input type="checkbox" checked={selection.focusBonus} disabled={!selection.focusBonus && events.filter((entry) => entry.id && entry.focusBonus).length >= 2} onChange={(change) => toggleEventBenefit(index, "focusBonus", change.currentTarget.checked)} /><span>Schwerpunkt verwenden</span></label>
                  {selection.attributeBonus && event.attribute === "any" && <SingleKeyChoice label="Attribut +1" value={selection.attribute} options={attributeOptions} labels={ATTRIBUTE_LABELS} onChange={(attribute) => updateEvent(index, { attribute })} />}
                  {selection.departmentBonus && event.department === "any" && <SingleKeyChoice label="Disziplin +1" value={selection.department} options={departmentOptions} labels={DEPARTMENT_LABELS} onChange={(department) => updateEvent(index, { department })} />}
                  {selection.focusBonus && <Field label="Fokus"><div className="flex gap-[8px]"><ChoiceInput value={selection.focus} options={focusNames} placeholder="Passender Schwerpunkt" onChange={(focus) => updateEvent(index, { focus })} /><button type="button" className="lcars-pill-btn--outline" onClick={() => setFocusSlot({ kind: "event", index })}>Katalog</button></div></Field>}
                  {event.optionalTrait && <Field label="Optionales Trait"><TextInput value={selection.trait ?? ""} onChange={(trait) => updateEvent(index, { trait: trait || null })} placeholder={event.optionalTrait} /></Field>}
                </div>
              </div>}
            </div>;
          })}
        </div>
        <button type="button" className="lcars-pill-btn--outline self-start" disabled={readOnly || events.length >= 8} onClick={() => updateSection("careerEvents", (current) => [...current, { ...newLifepathEvent(), attributeBonus: false, departmentBonus: false, focusBonus: false }])}>Weiteres Karriereereignis</button>
      </section>

      <section className="stat-editor-section">
        <h4 className="stat-editor-section-title">7 · Finishing Touches / Abschluss</h4>
        <Field label="Wert"><TextInput value={lp.finishing.value} onChange={(value) => updateSection("finishing", (section) => ({ ...section, value }))} placeholder="Ein weiterer persönlicher Wert" /></Field>
        <MultiIncrementChoices label="Attribut +1" count={2} values={lp.finishing.attributes} options={ATTRIBUTE_KEYS} labels={ATTRIBUTE_LABELS} onChange={(attributes) => updateSection("finishing", (section) => ({ ...section, attributes }))} distinct />
        <MultiIncrementChoices label="Disziplin +1" count={2} values={lp.finishing.departments} options={DEPARTMENT_KEYS} labels={DEPARTMENT_LABELS} onChange={(departments) => updateSection("finishing", (section) => ({ ...section, departments }))} distinct />
        <div className="stat-editor-grid">
          <Field label="Viertes Talent"><div className="flex gap-[8px]"><span className="stat-field-input flex-1">{lp.finishing.talent || "Noch nicht gewählt"}</span><button type="button" disabled={readOnly} className="lcars-pill-btn--outline" onClick={() => talentModalTarget("finishing")}>Talent wählen</button></div></Field>
          <Field label="Pastimes / Hobbys"><TextInput value={lp.finishing.pastimes[0] ?? ""} onChange={(value) => updateSection("finishing", (section) => ({ ...section, pastimes: value ? [value] : [] }))} placeholder="Optionales Hobby" /></Field>
        </div>
        {extraFocusCount > 0 && <div className="stat-editor-grid">
          {Array.from({ length: extraFocusCount }, (_, index) => <Field key={index} label={index < roleFocusCount ? (role?.id === "expert" ? "Expert: Fachgebiet" : `Ship’s Doctor: Medizinischer Schwerpunkt ${index + 1}`) : `Breadth of Study: Schwerpunkt ${index - roleFocusCount + 1}`}><div className="flex gap-[8px]"><ChoiceInput value={lp.roleBonus.focuses[index] ?? ""} options={focusNames} placeholder="Zusätzlicher Schwerpunkt" onChange={(focus) => updateSection("roleBonus", (section) => { const next = [...section.focuses]; next[index] = focus; return { ...section, focuses: next }; })} /><button type="button" className="lcars-pill-btn--outline" onClick={() => setFocusSlot({ kind: "role", index })}>Katalog</button></div></Field>)}
          {role?.id === "expert" && <Field label="Expert: zusätzlicher Wert"><TextInput value={lp.roleBonus.values[0] ?? ""} onChange={(value) => updateSection("roleBonus", (section) => ({ ...section, values: [value] }))} /></Field>}
        </div>}
        <div className="stat-editor-grid">
          <SelectField label="Punktumverteilung" value={correctionKind} options={[{ value: "attribute", label: "Attribut" }, { value: "department", label: "Disziplin" }]} onChange={(value) => { setCorrectionKind(value as "attribute" | "department"); setCorrectionFrom(""); setCorrectionTo(""); }} />
          <SelectField label="Von (mindestens 8 / 2)" value={correctionFrom} options={correctionChoices.from.map((key) => ({ value: key, label: correctionLabels[key as keyof typeof correctionLabels] }))} onChange={setCorrectionFrom} />
          <SelectField label={`Nach (höchstens ${stats.experience === "novice" ? "11 / 4" : "12 / 5"})`} value={correctionTo} options={correctionChoices.to.filter((key) => key !== correctionFrom).map((key) => ({ value: key, label: correctionLabels[key as keyof typeof correctionLabels] }))} onChange={setCorrectionTo} />
          <button type="button" className="lcars-pill-btn--outline self-end" disabled={readOnly || !correctionFrom || !correctionTo || correctionFrom === correctionTo} onClick={addCorrection}>Punkt verschieben</button>
        </div>
        {lp.corrections.length > 0 && <div className="stat-editor-list">{lp.corrections.map((correction, index) => <div className="stat-editor-list-line" key={`${correction.kind}-${correction.from}-${correction.to}-${index}`}><span>{correction.kind === "attribute" ? "Attribut" : "Disziplin"}: {correctionLabels[correction.from as keyof typeof correctionLabels]} → {correctionLabels[correction.to as keyof typeof correctionLabels]}</span><button type="button" className="lcars-pill-btn--outline" onClick={() => patchLifepath({ corrections: lp.corrections.filter((_, i) => i !== index) })}>Entfernen</button></div>)}</div>}
      </section>
      </fieldset>

      {talentSlot && <TalentModal talents={talents} stats={stats} species={species} taken={takenTalents} focuses={stats.focuses} cost={null} affordable onPick={(entry) => { setTalent(talentSlot, entry); setTalentSlot(null); }} onClose={() => setTalentSlot(null)} />}
      {focusSlot && <FocusModal focuses={focuses} taken={takenFocuses} cost={null} affordable onPick={(name) => { setFocus(focusSlot, name); setFocusSlot(null); }} onClose={() => setFocusSlot(null)} />}
    </section>
  );
}
