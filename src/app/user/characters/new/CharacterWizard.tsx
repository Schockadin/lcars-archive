"use client";

import { useActionState, useRef, useState } from "react";
import HeadFieldRenderer from "@/components/ContentEditor/HeadFieldRenderer";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import { renderMarkdownPreview } from "@/app/actions/markdownPreview";
import CharacterSheetPreview from "@/components/character/CharacterSheetPreview";
import { parsePortraitCrop, type PortraitCrop } from "@/lib/portraitCrop";
import { EXPERIENCE_OPTIONS, TEXT_FIELDS } from "@/lib/characterStats";
import CharacterValuesEditor from "../_shared/CharacterValuesEditor";
import CharacterEditorTabs, { type CharacterEditorTab } from "../_shared/CharacterEditorTabs";
import CharacterModuleCreationReference from "../_shared/CharacterModuleCreationReference";
import PortraitPicker from "../_shared/PortraitPicker";
import CharacterRoleSelect from "../_shared/CharacterRoleSelect";
import CharacterSpeciesMultiSelect from "../_shared/CharacterSpeciesMultiSelect";
import {
  createCharacterWizardAction,
  type CharacterWizardState,
} from "../_shared/wizardAction";
import {
  characterHeadFields,
  characterMetadataFields,
} from "../_shared/characterHeadFields";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import { applySta2eLifepath, EMPTY_STA2E_LIFEPATH } from "@/lib/sta2eLifepath";
import { getSpeciesAbilityChoices, getSpeciesLabel, SPECIES_OPTIONS } from "@/lib/sta2eCharacterOptions";
import { moduleSupportsCharacterRole, type RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";
import type { CharacterStats } from "@/types/characterStats";
import type { AdvancementRules } from "@/lib/advancement";
import type { Talent } from "@/lib/talentCatalog";
import type { Focus } from "@/lib/focusCatalog";
import type { CampaignRule } from "@/lib/campaignRuleTypes";

const initialState: CharacterWizardState = {};

// Pflichtfelder der Akte werden im Formular nicht nativ erzwungen: alle Tabs
// bleiben bedienbar, auch wenn sich das Feld gerade in einem inaktiven Tab
// befindet. Die Server-Action validiert die Eingaben verbindlich.
const headFields = characterHeadFields.map((field) => ({
  ...field,
  required: false,
}));

function safeJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

interface HeadSnapshot {
  name: string;
  rank: string | null;
  species: string[];
  portrait: string | null;
  portraitCrop: PortraitCrop | null;
}

export default function CharacterWizard({
  userId,
  rules,
  talents,
  focuses,
  campaignRules,
  ruleModules,
}: {
  userId: number;
  rules: AdvancementRules;
  talents: Talent[];
  focuses: Focus[];
  campaignRules: CampaignRule[];
  ruleModules: RuleModuleDefinition[];
}) {
  const [state, formAction, pending] = useActionState(
    createCharacterWizardAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTabId, setActiveTabId] = useState("values");
  const [stats, setStats] = useState<CharacterStats>(() => applySta2eLifepath({
    ...EMPTY_CHARACTER_STATS,
    creationMethod: "sta2e-lifepath",
    lifepath: EMPTY_STA2E_LIFEPATH,
  }));
  const [isDraft, setIsDraft] = useState(false);
  const [head, setHead] = useState<HeadSnapshot | null>(null);
  const [bioHtml, setBioHtml] = useState<string | null>(null);
  const [species, setSpecies] = useState<string[]>([]);

  function readHeadSnapshot(): HeadSnapshot | null {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim() || null;
    const file = data.get("portraitFile");
    const portrait = file instanceof File && file.size > 0
      ? URL.createObjectURL(file)
      : null;

    return {
      name: String(data.get("name") ?? "").trim(),
      rank: text("rank"),
      species: data.getAll("species").map(String).map((value) => value.trim()).filter(Boolean),
      portrait,
      portraitCrop: parsePortraitCrop(safeJson(text("portraitCrop"))),
    };
  }

  function setCreationMethod(method: CharacterStats["creationMethod"]) {
    if (method === stats.creationMethod) return;
    if (method === "ap") {
      setStats((current) => ({ ...current, creationMethod: "ap", lifepath: null }));
      return;
    }
    setStats((current) => applySta2eLifepath({
      ...current,
      creationMethod: "sta2e-lifepath",
      lifepath: EMPTY_STA2E_LIFEPATH,
      environment: null,
      upbringing: null,
      careerPath: null,
      experience: null,
      traits: null,
      careerEvents: [],
      attributes: { control: null, daring: null, fitness: null, insight: null, presence: null, reason: null },
      departments: { command: null, conn: null, engineering: null, security: null, medicine: null, science: null },
      values: [],
      focuses: [],
      talents: [],
      pastimes: [],
    }, species));
  }

  async function goToTab(nextId: string) {
    setActiveTabId(nextId);
    const form = formRef.current;
    if (form) {
      const data = new FormData(form);
      setSpecies(data.getAll("species").map(String).map((value) => value.trim()).filter(Boolean));
    }
    if (nextId === "files") {
      setHead(readHeadSnapshot());
      const markdown = form
        ? String(new FormData(form).get("bodyMarkdown") ?? "").trim()
        : "";
      setBioHtml(markdown ? await renderMarkdownPreview(markdown) : null);
    }
  }

  const moduleTabs = ruleModules
    .filter((module) => module.characterTab?.enabled)
    .filter((module) => moduleSupportsCharacterRole(module, stats.characterRole))
    .map((module): CharacterEditorTab => {
      const saved = stats.ruleModules[module.id] ?? {
        resources: {},
        selectedTalents: [],
        selectedStatuses: [],
        selectedCollectionEntries: {},
        prestigeClass: null,
        prestigeAbilities: [],
      };
      return {
        id: `module-${module.id}`,
        label: module.characterTab?.label || module.name,
        content: (
          <CharacterModuleCreationReference
            definition={module}
            saved={saved}
            onChange={(value) => setStats((current) => ({
              ...current,
              ruleModules: { ...current.ruleModules, [module.id]: value },
            }))}
          />
        ),
      };
    });

  const tabs: CharacterEditorTab[] = [
    {
      id: "values",
      label: "Werte",
      content: (
        <div className="flex flex-col gap-[16px]">
          <section className="stat-editor-section">
            <h3 className="stat-editor-section-title">Erstellungsmethode</h3>
            <label className="stat-editor-field" htmlFor="wizard-creation-method">
              <span className="stat-field-label">
                <span className="stat-label-primary">Character Creation</span>
                <span className="stat-label-secondary">Charaktererschaffung</span>
              </span>
              <select id="wizard-creation-method" className="stat-field-input" value={stats.creationMethod} onChange={(event) => setCreationMethod(event.currentTarget.value as CharacterStats["creationMethod"])}>
                <option value="sta2e-lifepath">STA 2e Lifepath</option>
                <option value="ap">AP-Budget (Kampagnenregel)</option>
              </select>
            </label>
            <p className="stat-sheet-rule">Der STA-2e-Lifepath ist vorausgewählt. Die AP-Budget-Methode bleibt als kampagnenspezifische Alternative verfügbar.</p>
          </section>
          <CharacterValuesEditor
            stats={stats}
            onChange={setStats}
            rules={rules}
            talents={talents}
            focuses={focuses}
            species={species}
            idPrefix="wizard-stats"
            showPersonnelFields={false}
          />
        </div>
      ),
    },
    ...moduleTabs,
    {
      id: "personal",
      label: "Persönliche Daten",
      content: (
        <div className="flex flex-col gap-[12px]">
          <div className="content-editor-head-grid">
            <PortraitPicker idPrefix="wizard" />
            <CharacterSpeciesMultiSelect
              idPrefix="wizard"
              value={species}
              onChange={(nextSpecies) => {
                setSpecies(nextSpecies);
                const abilityValues = new Set(
                  getSpeciesAbilityChoices(SPECIES_OPTIONS.map((option) => option.name)).map((ability) => ability.value),
                );
                const availableValues = new Set(
                  getSpeciesAbilityChoices(nextSpecies).map((ability) => ability.value),
                );
                setStats((current) => {
                  const updated = {
                    ...current,
                  speciesAbilities: current.speciesAbilities.filter(
                    (entry) => !abilityValues.has(entry) || availableValues.has(entry),
                  ),
                  };
                  return current.creationMethod === "sta2e-lifepath"
                    ? applySta2eLifepath(updated, nextSpecies)
                    : updated;
                });
              }}
            />
            {headFields.map((field) => (
              <HeadFieldRenderer
                key={field.name}
                field={field}
                idPrefix="wizard"
                defaultValue={field.name === "status" ? "active" : undefined}
              />
            ))}
            {characterMetadataFields.map((field) => (
              <HeadFieldRenderer
                key={field.name}
                field={field}
                idPrefix="wizard"
                defaultValue={undefined}
              />
            ))}
            {TEXT_FIELDS.filter((field) => field.key !== "characterRole" && (!stats.creationMethod || stats.creationMethod !== "sta2e-lifepath" || field.key === "pronouns" || field.key === "assignment")).map((field) => (
              <label key={field.key} className="stat-editor-field" htmlFor={`wizard-personal-${field.key}`}>
                <span className="stat-field-label">
                  <span className="stat-label-primary">{field.original ?? field.label}</span>
                  <span className="stat-label-secondary">{field.label}</span>
                </span>
                <input
                  id={`wizard-personal-${field.key}`}
                  className="stat-field-input"
                  type="text"
                  value={stats[field.key] ?? ""}
                  onChange={(event) => setStats((current) => ({
                    ...current,
                    [field.key]: event.currentTarget.value || null,
                  }))}
                />
              </label>
            ))}
            <CharacterRoleSelect
              id="wizard-personal-characterRole"
              value={stats.characterRole}
              onChange={(value) => setStats((current) => {
                const updated = { ...current, characterRole: value };
                return current.creationMethod === "sta2e-lifepath"
                  ? applySta2eLifepath(updated, species)
                  : updated;
              })}
            />
            {stats.creationMethod !== "sta2e-lifepath" && <label className="stat-editor-field" htmlFor="wizard-personal-experience">
              <span className="stat-field-label">
                <span className="stat-label-primary">Experience</span>
                <span className="stat-label-secondary">Erfahrungsstufe</span>
              </span>
              <select
                id="wizard-personal-experience"
                className="stat-field-input"
                value={stats.experience ?? ""}
                onChange={(event) => setStats((current) => ({
                  ...current,
                  experience: (event.currentTarget.value || null) as CharacterStats["experience"],
                }))}
              >
                <option value="">— keine Angabe —</option>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>}
          </div>
        </div>
      ),
    },
    {
      id: "biography",
      label: "Biografie",
      content: (
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="wizard-body" className="lcars-eyebrow">Biografie (optional)</label>
          <MarkdownEditor id="wizard-body" timelineMarker large />
          <p className="lcars-text text-[14px]"><MarkdownFormatHint /></p>
          <AutoLinkCheckbox idPrefix="wizard" defaultChecked />
        </div>
      ),
    },
    {
      id: "files",
      label: "Dateien",
      content: (
        <div className="flex flex-col gap-[12px]">
          <p className="lcars-text">
            Prüfe die Vorschau des Charakterbogens. Dateien kannst du nach dem Anlegen in diesem Tab ergänzen.
            Mit <strong>Fertig</strong> wird der Charakter angelegt.
          </p>
          {head && (
            <CharacterSheetPreview
              input={{
                characterName: head.name,
                rank: head.rank,
                species: head.species.map(getSpeciesLabel).join(", ") || null,
                portrait: head.portrait,
                portraitCrop: head.portraitCrop,
                stats,
                bioHtml,
                talents,
                campaignRules,
              }}
            />
          )}
          <div className="flex items-center gap-[8px]">
            <input
              id="wizard-is-draft"
              name="isDraft"
              type="checkbox"
              checked={isDraft}
              onChange={(event) => setIsDraft(event.target.checked)}
              className="h-[16px] w-[16px]"
            />
            <label htmlFor="wizard-is-draft" className="lcars-text text-[14px]">
              Als Entwurf anlegen (sichtbar nur für dich, bis du ihn veröffentlichst)
            </label>
          </div>
          <SubmitButton pending={pending} pendingLabel="Wird angelegt…" className="wizard-nav-btn self-start">
            <CheckIcon />
            Fertig
          </SubmitButton>
        </div>
      ),
    },
  ];
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTabId));

  function navigateBy(offset: number) {
    const next = tabs[activeIndex + offset];
    if (next) void goToTab(next.id);
  }

  const navigation = (
    <div className="wizard-nav">
      <button
        type="button"
        onClick={() => navigateBy(-1)}
        disabled={activeIndex === 0}
        aria-label="Zum vorherigen Tab"
        className="wizard-nav-btn wizard-nav-btn--outline"
      >
        <ChevronLeftIcon /> Zurück
      </button>
      {activeIndex < tabs.length - 1 && (
        <button
          type="button"
          onClick={() => navigateBy(1)}
          aria-label="Zum nächsten Tab"
          className="wizard-nav-btn"
        >
          Weiter <ChevronRightIcon />
        </button>
      )}
    </div>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="character-wizard flex flex-col gap-[16px]"
      onKeyDown={(event) => {
        if (event.key === "Enter" && activeTabId !== "files") {
          const target = event.target as HTMLElement;
          if (target.tagName === "INPUT") event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="statsJson" value={JSON.stringify(stats)} />
      {navigation}
      <CharacterEditorTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onActiveTabChange={(id) => { void goToTab(id); }}
      />
      {navigation}
      <FormError message={state?.error} />
    </form>
  );
}
