"use client";
import { useState } from "react";
import { notFound } from "next/navigation";
import {
  LcarsSwitch,
  LcarsSortSwitch,
  LcarsDataRow,
  type SortDir,
} from "@/components/lcars";
import CharacterWizard from "@/app/user/characters/new/CharacterWizard";
import CharacterSheetPreviewOverlay from "@/components/character/CharacterSheetPreviewOverlay";
import PersonnelFileView from "@/components/character/PersonnelFileView";
import RelationGraph from "@/components/character/RelationGraph";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import TimelineView from "@/components/timeline/TimelineView";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import { buildOnboardingSteps } from "@/lib/onboardingSteps";
import type { TimelineEvent } from "@/lib/timelineTypes";
import { DEFAULT_ADVANCEMENT_RULES } from "@/lib/advancement";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import type { Talent } from "@/lib/talentCatalog";
import type { Focus } from "@/lib/focusCatalog";
import type { CampaignRule } from "@/lib/campaignRuleTypes";

// Zwei Katalog-Talente reichen für die Auswahl im Werte-Schritt und für den
// Regeltext auf dem Spickzettel-Blatt — eines ohne, eines mit Voraussetzung.
const DEMO_TALENTS: Talent[] = [
  {
    id: 1,
    name: "Bold: Command",
    category: "general",
    requirement: null,
    description:
      "Beim Einsatz von Command darfst du einen zusätzlichen Würfel neu werfen.",
  },
  {
    id: 2,
    name: "Mental Discipline",
    category: "species",
    requirement: "Vulcan",
    description: "Vulcanische Geistesdisziplin gegen Furcht und Beeinflussung.",
  },
].map((talent) => ({ ...talent, isCustom: false }) as Talent);

// Dito für den Schwerpunkt-Katalog (siehe /gm/focuses).
const DEMO_FOCUSES: Focus[] = [
  { id: 1, name: "Astrophysics", discipline: "science", description: null },
  { id: 2, name: "Helm Operations", discipline: "conn", description: null },
  { id: 3, name: "Diplomacy", discipline: "command", description: null },
].map((focus) => ({ ...focus, isCustom: false }) as Focus);

// Und für die Hausregeln der Runde (siehe /gm/rules).
const DEMO_RULES: CampaignRule[] = [
  {
    id: 1,
    name: "Kritische Erfolge",
    body: "Eine gewürfelte 1 zählt als zwei Erfolge — auch ohne passenden Schwerpunkt.",
    bodyHtml:
      "<p>Eine gewürfelte 1 zählt als <strong>zwei Erfolge</strong> — auch ohne passenden Schwerpunkt.</p>",
    sortOrder: 0,
  },
];

// Ein kleiner Beziehungsgraph: drei Figuren, zwei Kanten — genug, um Knoten,
// Kantenstärke und das Hervorheben beim Zeigen zu prüfen (siehe
// /characters/beziehungen).
const DEMO_GRAPH = {
  nodes: [
    { slug: "tuvok", name: "Tuvok", kind: "character" as const, href: "/characters/tuvok" },
    { slug: "quark", name: "Barkeeper Quark", kind: "npc" as const, href: "/archive/quark" },
    { slug: "kira", name: "Kira", kind: "character" as const, href: "/characters/kira" },
  ],
  edges: [
    { source: "kira", target: "tuvok", sharedMissions: 3, sharedDialogues: 1 },
    { source: "quark", target: "tuvok", sharedMissions: 0, sharedDialogues: 2 },
  ],
};

// Einstiegs-Schritte mit halbem Fortschritt (siehe /willkommen): Passwort und
// Charakter erledigt, der Rest offen.
const DEMO_ONBOARDING = buildOnboardingSteps({
  hasPassword: true,
  characterCount: 1,
  lockedCharacterCount: 0,
  logCount: 0,
  dialogueCount: 0,
});

// Vier Ereignisse der Chronologie über zwei Jahre und drei Monate: genug für
// die Jahresleiste, die Monats-Trenner und je ein Beispiel der drei Herkünfte
// (gepflegte Angabe, Marke im Text, vom Modell abgeleitet).
const DEMO_TIMELINE: TimelineEvent[] = [
  {
    id: "mission:erste:start",
    date: "2401-03-05",
    title: "Erste Mission",
    detail: "Beginn des Einsatzes.",
    category: "mission",
    origin: "metadata",
    sourceType: "mission",
    sourceTitle: "Erste Mission",
    href: "/missions/erste-mission",
    people: ["Tuvok", "Kira"],
  },
  {
    id: "mission_log:log-1:marker-1",
    date: "2401-03-07",
    title: "Erstkontakt mit der Sonde",
    detail: null,
    category: "discovery",
    origin: "marker",
    sourceType: "mission_log",
    sourceTitle: "Log Eins",
    href: "/missions/erste-mission/log-1#timeline-1",
    people: ["Tuvok"],
  },
  {
    id: "inferred:1",
    date: "2401-03-09",
    title: "Zwischenfall im Maschinenraum",
    detail: "Zwei Tage später kam es zu einem Zwischenfall.",
    category: "conflict",
    origin: "inferred",
    sourceType: "mission_log",
    sourceTitle: "Log Eins",
    href: "/missions/erste-mission/log-1",
    people: [],
  },
  {
    id: "character:tuvok:birth",
    date: "2364-05-11",
    title: "Tuvok geboren",
    detail: null,
    category: "character",
    origin: "metadata",
    sourceType: "character",
    sourceTitle: "Tuvok",
    href: "/characters/tuvok",
    people: ["Tuvok"],
  },
];

// Nur für lokale Playwright-E2E-Läufe (next dev) — testet Layout-Details
// (Switch-Trenner/-Hintergrund, DataRow-Pillen-Breiten), die jsdom
// grundsätzlich nicht prüfen kann, weil dort kein echtes Boxmodell berechnet
// wird. In echten Deployments nicht buildbar/erreichbar.
if (process.env.NODE_ENV === "production") notFound();

export default function DevGalleryPage() {
  const [twoOption, setTwoOption] = useState<"a" | "b">("a");
  const [fiveOption, setFiveOption] = useState<"1" | "2" | "3" | "4" | "5">(
    "1",
  );
  const [sortKey, setSortKey] = useState<"name">("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <article className="mb-[10px] lcars-wide-column">
      <h1>Dev Gallery</h1>

      <section id="switch-two" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Switch (2 Optionen)</h2>
        <LcarsSwitch
          options={[
            { key: "a", label: "Option A" },
            { key: "b", label: "Option B" },
          ]}
          active={twoOption}
          onChange={setTwoOption}
        />
      </section>

      <section id="switch-five" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Switch (5 Optionen, ungerade Anzahl)</h2>
        <LcarsSwitch
          options={[
            { key: "1", label: "1" },
            { key: "2", label: "2" },
            { key: "3", label: "3" },
            { key: "4", label: "4" },
            { key: "5", label: "5" },
          ]}
          active={fiveOption}
          onChange={setFiveOption}
        />
      </section>

      <section className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">SortSwitch</h2>
        <LcarsSortSwitch
          options={[{ key: "name", label: "Name" }]}
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(key, dir) => {
            setSortKey(key);
            setSortDir(dir);
          }}
        />
      </section>

      {/* Der Anlege-Assistent (/user/characters/new) mit Attrappen-Daten:
          Die echte Seite braucht Login und Datenbank, die Schritt-Navigation
          und der Werte-Editor sind aber reine Client-Logik. */}
      <section
        id="character-wizard"
        className="flex flex-col gap-[8px] mb-[24px]"
      >
        <h2 className="lcars-text">Charakter-Assistent</h2>
        <CharacterWizard
          userId={1}
          isAdminOrGM={false}
          rules={DEFAULT_ADVANCEMENT_RULES}
          talents={DEMO_TALENTS}
          focuses={DEMO_FOCUSES}
          campaignRules={DEMO_RULES}
        />
      </section>

      <section
        id="character-sheet-preview"
        className="flex flex-col gap-[8px] mb-[24px]"
      >
        <h2 className="lcars-text">Bogen-Vorschau</h2>
        <button
          type="button"
          id="open-sheet-preview"
          className="lcars-pill-btn"
          onClick={() => setPreviewOpen(true)}
        >
          Vorschau öffnen
        </button>
        {previewOpen && (
          <CharacterSheetPreviewOverlay
            input={{
              characterName: "Demo Charakter",
              rank: "Lieutenant",
              species: "Vulkanier",
              portrait: null,
              stats: {
                ...EMPTY_CHARACTER_STATS,
                talents: ["Mental Discipline"],
              },
              bioHtml: "<p>Geboren auf Vulkan.</p>",
              talents: DEMO_TALENTS,
              campaignRules: DEMO_RULES,
            }}
            downloadUrl="/api/export/character-sheet?id=1"
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </section>

      {/* Der Bogen als reine Ansicht (siehe /characters/[slug]/sheet). Die
          Kästchen für Entschlossenheit und Stress sind hier prüfbar, ohne
          dass es einen Charakter in der Datenbank gäbe — und genau sie muss
          das PDF nachzeichnen (CharacterSheetPdfDocument.tsx). */}
      <section id="personnel-file" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Charakterbogen (Ansicht)</h2>
        <PersonnelFileView
          characterName="Demo Charakter"
          rank="Lieutenant"
          species="Vulkanier"
          portrait={null}
          expandable={false}
          stats={{
            ...EMPTY_CHARACTER_STATS,
            determination: 2,
            attributes: { ...EMPTY_CHARACTER_STATS.attributes, fitness: 9 },
            values: ["Logik zuerst"],
          }}
        />
      </section>

      <section id="relation-graph" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Beziehungsgraph</h2>
        <RelationGraph graph={DEMO_GRAPH} />
      </section>

      <section
        id="onboarding-checklist"
        className="flex flex-col gap-[8px] mb-[24px]"
      >
        <h2 className="lcars-text">Erste Schritte</h2>
        <OnboardingChecklist steps={DEMO_ONBOARDING} />
      </section>

      <section id="settings-panel" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">SettingsPanel</h2>
        <SettingsPanel title="Nebeneinander" hint="Kopfzeile als Zeile" badge="3">
          <p className="lcars-text">Inhalt des Panels.</p>
        </SettingsPanel>
        <SettingsPanel
          title="Gestapelt"
          hint="Kopfzeile untereinander"
          badge="3"
          stacked
        >
          <p className="lcars-text">Inhalt des Panels.</p>
        </SettingsPanel>
      </section>

      <section
        id="markdown-editor"
        className="flex flex-col gap-[8px] mb-[24px]"
      >
        <h2 className="lcars-text">Markdown-Editor (10 Zeilen)</h2>
        <MarkdownEditor id="demo-markdown" rows={10} defaultValue="**Text**" />
      </section>

      {/* Die Chronologie (/chronologie) mit Attrappen-Ereignissen: die echte
          Seite braucht die Datenbank und die Sichtbarkeit des Betrachters. */}
      <section id="timeline" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Chronologie</h2>
        <TimelineView events={DEMO_TIMELINE} />
      </section>

      <section className="flex flex-col gap-[10px]">
        <h2 className="lcars-text">DataRow</h2>
        <LcarsDataRow value="01" label="Erste Zeile" />
        <LcarsDataRow value="02" label="Zweite Zeile" href="/dev-gallery" />
      </section>
    </article>
  );
}
