"use client";
import { useActionState, useRef, useState } from "react";
import HeadFieldRenderer from "@/components/ContentEditor/HeadFieldRenderer";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import AutoLinkCheckbox from "@/app/_shared/AutoLinkCheckbox";
import { SubmitButton, FormError } from "@/app/_shared/FormPrimitives";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import { renderMarkdownPreview } from "@/app/actions/markdownPreview";
import CharacterSheetPreview from "@/components/character/CharacterSheetPreview";
import CharacterValuesEditor from "../_shared/CharacterValuesEditor";
import PortraitPicker from "../_shared/PortraitPicker";
import {
  createCharacterWizardAction,
  type CharacterWizardState,
} from "../_shared/wizardAction";
import {
  characterHeadFields,
  characterMetadataFields,
} from "../_shared/characterHeadFields";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FileTextIcon,
  MyCharactersNavIcon,
  StatsIcon,
} from "@/lib/icons";
import type { CharacterStats } from "@/types/characterStats";
import type { AdvancementRules } from "@/lib/advancement";
import type { Talent } from "@/lib/talentCatalog";
import type { Focus } from "@/lib/focusCatalog";
import type { CampaignRule } from "@/lib/campaignRuleTypes";

const initialState: CharacterWizardState = {};

// Jeder Schritt hat ein eigenes Icon: auf schmalen Geräten steht die
// Schrittleiste ohne Beschriftung da (siehe .wizard-step-label in
// character-stats.css), und vier gleich aussehende Nummern wären dort nicht
// zu unterscheiden. Beschriftung und Position bleiben als aria-label bzw.
// title erhalten, die Leiste ist also auch ohne sichtbaren Text bedienbar.
const STEPS = [
  { key: "head", label: "Stammdaten", Icon: MyCharactersNavIcon },
  { key: "stats", label: "Werte", Icon: StatsIcon },
  { key: "bio", label: "Biografie", Icon: FileTextIcon },
  { key: "preview", label: "Vorschau", Icon: EyeIcon },
] as const;

// Pflichtfelder werden hier NICHT über das required-Attribut erzwungen: die
// Schritte bleiben alle im DOM (nur ausgeblendet), und ein Browser kann ein
// verstecktes Pflichtfeld nicht anspringen — er bricht das Abschicken dann
// wortlos ab. Geprüft wird stattdessen beim Weiterblättern (unten) und
// verbindlich in der Server-Action.
const headFields = characterHeadFields.map((field) => ({
  ...field,
  required: false,
}));

// Was die Vorschau über die Akte wissen muss. Kommt nicht aus einem State,
// sondern beim Wechsel auf den letzten Schritt frisch aus dem Formular — dort
// steht ohnehin genau das, was gleich abgeschickt wird.
interface HeadSnapshot {
  name: string;
  rank: string | null;
  species: string | null;
  portrait: string | null;
}

// Anlege-Assistent für einen neuen Charakter: vier Schritte, jederzeit vor und
// zurück. Alle Schritte liegen in EINEM Formular und bleiben im DOM —
// Eingaben gehen beim Blättern deshalb nicht verloren, und am Ende schickt ein
// einziger Submit alles zusammen ab (siehe createCharacterWizardAction).
// Angelegt wird also erst mit „Fertig"; wer den Assistenten verlässt, lässt
// keinen halben Charakter zurück.
export default function CharacterWizard({
  userId,
  isAdminOrGM,
  rules,
  talents,
  focuses,
  campaignRules,
}: {
  userId: number;
  isAdminOrGM: boolean;
  // Regelwerk und Kataloge für den Werte-Schritt (Budgets, Freikontingente,
  // Talent- und Schwerpunkt-Auswahl).
  rules: AdvancementRules;
  talents: Talent[];
  focuses: Focus[];
  // Hausregeln der Runde für den Spickzettel in der Vorschau (Schritt 4).
  campaignRules: CampaignRule[];
}) {
  const [state, formAction, pending] = useActionState(
    createCharacterWizardAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState(0);
  const [stats, setStats] = useState<CharacterStats>(EMPTY_CHARACTER_STATS);
  const [isDraft, setIsDraft] = useState(false);
  const [stepError, setStepError] = useState<string | undefined>();

  // Nur für den Vorschau-Schritt, beim Betreten gefüllt.
  const [head, setHead] = useState<HeadSnapshot | null>(null);
  const [bioHtml, setBioHtml] = useState<string | null>(null);
  // Die Spezies steht im ersten Schritt, gebraucht wird sie im zweiten (die
  // Talent-Auswahl prüft Voraussetzungen wie „Vulcan" dagegen). Beim
  // Blättern übernommen statt beim Rendern aus dem Formular gelesen — ein
  // ref darf im Render nicht angefasst werden.
  const [species, setSpecies] = useState<string | null>(null);

  function readHeadSnapshot(): HeadSnapshot | null {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim() || null;

    // Für die Vorschau zählt, was der Bogen später zeigt: der gewählte
    // Ausschnitt, sonst die hochgeladene Datei (lokal angezeigt, ins Netz geht
    // sie erst beim Abschicken). Ein neuer Charakter hat sonst nichts —
    // Portraits kommen ausschließlich als Datei.
    const cropped = text("portraitCropped");
    const file = data.get("portraitFile");
    const portrait =
      cropped ||
      (file instanceof File && file.size > 0
        ? URL.createObjectURL(file)
        : null);

    return {
      name: String(data.get("name") ?? "").trim(),
      rank: text("rank"),
      species: text("species"),
      portrait,
    };
  }

  async function goToStep(next: number) {
    setStepError(undefined);

    const currentForm = formRef.current;
    if (currentForm) {
      setSpecies(
        String(new FormData(currentForm).get("species") ?? "").trim() || null,
      );
    }

    // Vorwärts nur mit Namen: er wird für Slug und Anzeige gebraucht und ist
    // das einzige echte Pflichtfeld der Akte.
    if (next > 0) {
      const form = formRef.current;
      const name = form
        ? String(new FormData(form).get("name") ?? "").trim()
        : "";
      if (!name) {
        setStep(0);
        setStepError("Bitte zuerst einen Namen angeben.");
        return;
      }
    }

    if (next === STEPS.length - 1) {
      setHead(readHeadSnapshot());
      const form = formRef.current;
      const markdown = form
        ? String(new FormData(form).get("bodyMarkdown") ?? "").trim()
        : "";
      // Markdown wird serverseitig gerendert (dieselbe Pipeline wie die
      // Vorschau im Editor) — die remark/rehype-Kette gehört nicht ins
      // Browser-Bundle.
      setBioHtml(markdown ? await renderMarkdownPreview(markdown) : null);
    }

    setStep(next);
  }

  const isLast = step === STEPS.length - 1;

  // Blättern und Abschluss: Icon plus Beschriftung, letztere auf schmalen
  // Geräten ausgeblendet wie in der Schrittleiste. Dasselbe Element steht
  // oben neben der Schrittleiste UND unten unter dem Schritt — auf den
  // langen Schritten (Werte, Biografie) liegt der untere Knopf sonst weit
  // unterhalb des Bildschirms, auf den kurzen der obere weit oberhalb des
  // Formularendes.
  const navButtons = (
    <div className="wizard-nav">
      <button
        type="button"
        onClick={() => goToStep(step - 1)}
        disabled={step === 0}
        aria-label="Zurück"
        title="Zurück"
        className="wizard-nav-btn wizard-nav-btn--outline"
      >
        <ChevronLeftIcon />
        <span className="wizard-step-label">Zurück</span>
      </button>
      {!isLast && (
        <button
          type="button"
          onClick={() => goToStep(step + 1)}
          aria-label="Weiter"
          title="Weiter"
          className="wizard-nav-btn"
        >
          <span className="wizard-step-label">Weiter</span>
          <ChevronRightIcon />
        </button>
      )}
      {isLast && (
        <SubmitButton
          pending={pending}
          pendingLabel="Wird angelegt…"
          className="wizard-nav-btn"
        >
          <CheckIcon />
          <span className="wizard-step-label">Fertig</span>
        </SubmitButton>
      )}
    </div>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="character-wizard flex flex-col gap-[16px]"
      // Enter in einem Textfeld soll blättern, nicht den halb ausgefüllten
      // Assistenten abschicken.
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isLast) {
          const target = e.target as HTMLElement;
          if (target.tagName === "INPUT") e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      {/* Die Werte reisen als ein JSON-Feld; der Editor führt sie ohnehin als
          zusammenhängenden Zustand (siehe characterStatsPayload.ts). */}
      <input type="hidden" name="statsJson" value={JSON.stringify(stats)} />

      {/* ── Kopfzeile: Schrittleiste und Blätter-Knöpfe ───────────── */}
      <div className="wizard-bar">
        <ol className="wizard-steps" aria-label="Schritte">
          {STEPS.map((entry, index) => (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => goToStep(index)}
                aria-current={index === step ? "step" : undefined}
                aria-label={`Schritt ${index + 1}: ${entry.label}`}
                title={`Schritt ${index + 1}: ${entry.label}`}
                className={
                  index === step
                    ? "wizard-step wizard-step--active"
                    : "wizard-step"
                }
              >
                <entry.Icon />
                <span className="wizard-step-label">
                  {index + 1}. {entry.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {navButtons}
      </div>

      {/* ── 1. Stammdaten ─────────────────────────────────────────── */}
      <fieldset hidden={step !== 0} className="border-0 p-0 m-0">
        <legend className="sr-only">Stammdaten</legend>
        <div className="content-editor-head-grid">
          {/* Portrait mit eigenem Editor (Ausschnitt wählen), deshalb nicht
              Teil der generischen Feldliste. */}
          <PortraitPicker idPrefix="wizard" />
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
        </div>
      </fieldset>

      {/* ── 2. Werte ──────────────────────────────────────────────── */}
      <fieldset hidden={step !== 1} className="border-0 p-0 m-0">
        <legend className="sr-only">Charakterwerte</legend>
        <CharacterValuesEditor
          stats={stats}
          onChange={setStats}
          rules={rules}
          talents={talents}
          focuses={focuses}
          species={species}
          idPrefix="wizard-stats"
        />
      </fieldset>

      {/* ── 3. Biografie ──────────────────────────────────────────── */}
      <fieldset hidden={step !== 2} className="border-0 p-0 m-0">
        <legend className="sr-only">Biografie</legend>
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="wizard-body" className="lcars-eyebrow">
            Biografie (optional)
          </label>
          <MarkdownEditor id="wizard-body" isAdminOrGM={isAdminOrGM} large />
          <p className="lcars-text text-[14px]">
            <MarkdownFormatHint />
          </p>
          <AutoLinkCheckbox idPrefix="wizard" defaultChecked />
        </div>
      </fieldset>

      {/* ── 4. Vorschau ───────────────────────────────────────────── */}
      <fieldset hidden={!isLast} className="border-0 p-0 m-0">
        <legend className="sr-only">Vorschau</legend>
        <p className="lcars-text">
          So sieht der Charakterbogen aus: Blatt 1 die Personalakte mit
          Stammdaten und Werten, Blatt 2 der Talent-Spickzettel, Blatt 3 die
          Biografie. Mit <strong>Fertig</strong> wird der Charakter angelegt —
          vorher ist nichts gespeichert.
        </p>
        {head && (
          <CharacterSheetPreview
            input={{
              characterName: head.name,
              rank: head.rank,
              species: head.species,
              portrait: head.portrait,
              stats,
              bioHtml,
              talents,
              campaignRules,
            }}
          />
        )}
      </fieldset>

      {/* ── Entwurf, Navigation, Abschluss ────────────────────────── */}
      <div className="flex items-center gap-[8px]">
        <input
          id="wizard-is-draft"
          name="isDraft"
          type="checkbox"
          checked={isDraft}
          onChange={(e) => setIsDraft(e.target.checked)}
          className="h-[16px] w-[16px]"
        />
        <label htmlFor="wizard-is-draft" className="lcars-text text-[14px]">
          Als Entwurf anlegen (sichtbar nur für dich, bis du ihn
          veröffentlichst)
        </label>
      </div>

      {navButtons}

      <FormError message={stepError ?? state?.error} />
    </form>
  );
}
