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
import ManualEventForm from "@/components/timeline/ManualEventForm";
import { latestEventDate } from "@/lib/timelineTypes";
import PersonnelFileView from "@/components/character/PersonnelFileView";
import RelationGraph from "@/components/character/RelationGraph";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import TimelineView from "@/components/timeline/TimelineView";
import ArchiveEntryList from "@/app/archive/ArchiveEntryList";
import CharacterPage from "@/app/characters/CharacterPage";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import PortraitPicker from "@/app/user/characters/_shared/PortraitPicker";
import { buildOnboardingSteps } from "@/lib/onboardingSteps";
import type { TimelineEvent } from "@/lib/timelineTypes";
import type { ArchiveEntryPreview } from "@/types/archive";
import type { CharacterListItem } from "@/lib/characters";
import { missionHref, missionLogHref } from "@/lib/contentRoutes";
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

// Sechs Ereignisse der Chronologie über zwei Jahre: genug für die
// Jahresleiste, die Monats-Trenner, je ein Beispiel der drei Herkünfte
// (gepflegte Angabe, Marke im Text, vom Modell abgeleitet) — und für beide
// Umfänge, denn zwei davon sind Missionsstarts (die Vorgabe-Ansicht) und
// eines ist ein Missionsende, das dort NICHT erscheinen darf.
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
    href: missionHref("erste-mission"),
    people: ["Tuvok", "Kira"],
    phase: "start",
  },
  {
    id: "mission:zweite:start",
    date: "2401-06-12",
    title: "Zweite Mission",
    detail: "Beginn des Einsatzes.",
    category: "mission",
    origin: "metadata",
    sourceType: "mission",
    sourceTitle: "Zweite Mission",
    href: missionHref("zweite-mission"),
    people: ["Kira"],
    phase: "start",
  },
  {
    id: "mission:erste:end",
    date: "2401-03-20",
    title: "Erste Mission",
    detail: "Abschluss des Einsatzes.",
    category: "mission",
    origin: "metadata",
    sourceType: "mission",
    sourceTitle: "Erste Mission",
    href: missionHref("erste-mission"),
    people: ["Tuvok", "Kira"],
    phase: "end",
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
    href: `${missionLogHref("erste-mission", "log-1")}#timeline-1`,
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
    href: missionLogHref("erste-mission", "log-1"),
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
  // Ein Gespräch ohne In-Story-Datum: die Chronologie ist seit dem Umzug aus
  // dem Charaktere-Bereich die Übersicht der Gespräche, also gehört es dazu —
  // als Gruppe „Ohne Datum" am Ende (siehe sortEvents in timelineTypes.ts).
  {
    id: "archive_entry:schichtwechsel:date",
    date: null,
    title: "Schichtwechsel auf Deck 9",
    detail: "Ein Gespräch ohne gepflegtes Datum.",
    category: "dialogue",
    origin: "metadata",
    sourceType: "archive_entry",
    sourceTitle: "Schichtwechsel auf Deck 9",
    href: "/characters/dialogues/schichtwechsel-auf-deck-9",
    people: ["Kira"],
  },
];

// Attrappen-Charaktere: je Status einer, einmal mit vollen Angaben (Rang,
// Spezies, Zugehörigkeit, Spieler) und einmal fast leer — mehr braucht die
// Karte nicht, um alle ihre Zeilen zu zeigen.
const DEMO_CHARACTERS: CharacterListItem[] = [
  {
    id: 1,
    slug: "tuvok",
    name: "Tuvok",
    status: "active",
    updated_at: "2401-06-12",
    // Eine Figur MIT Bild: auf der echten Seite das Portrait bzw. das erste
    // hochgeladene Bild, hier ein Symbol aus /public (die Galerie hat keine
    // Datenbank). Die beiden anderen bleiben ohne Bild — so steht in der
    // Galerie beides nebeneinander: mit Vorschaubild und ohne (ohne Bild
    // wird kein Platzhalter gezeigt).
    thumbnail: "/icons/icon-192.png",
    metadata: {
      rank: "Lieutenant Commander",
      species: ["Vulkanier"],
      homeworld: "Vulcan",
      age: null,
      dateOfBirth: "2364-05-11",
      affiliation: {
        ships: ["USS Aurora"],
        factions: ["Sternenflotte"],
        division: "command",
      },
      player: "Dominic",
      tags: [],
      aliases: [],
      generation: [1],
    },
  },
  {
    id: 2,
    slug: "kira",
    name: "Kira Nerys",
    status: "retired",
    updated_at: "2401-03-20",
    thumbnail: null,
    metadata: {
      rank: "Commander",
      species: ["Bajoraner"],
      homeworld: null,
      age: null,
      dateOfBirth: null,
      affiliation: null,
      player: null,
      tags: [],
      aliases: [],
      generation: [1, 2],
    },
  },
  {
    id: 3,
    slug: "shran",
    name: "Thy'lek Shran",
    status: "deceased",
    updated_at: "2400-11-02",
    thumbnail: null,
    metadata: {
      rank: null,
      species: ["Andorianer"],
      homeworld: "Andor",
      age: null,
      dateOfBirth: null,
      affiliation: null,
      player: null,
      tags: [],
      aliases: [],
      generation: [2],
    },
  },
];

// Attrappen-Einträge der Datenbank: je Kategorie eine andere Farbe, einmal
// mit Kurzfassung/Attributen/Tags und einmal ohne — mehr braucht die Karte
// nicht, um alle ihre Zeilen zu zeigen.
const DEMO_ARCHIVE: ArchiveEntryPreview[] = [
  {
    id: 1,
    slug: "andor",
    title: "Andor",
    category: "location",
    tags: ["Eiswelt", "Föderation"],
    // Ein Eintrag MIT Bild, die beiden anderen ohne — so steht in der Galerie
    // beides nebeneinander (ohne Bild kein Platzhalter).
    thumbnail: "/icons/icon-192.png",
    metadata: {
      summary: "Der Heimatplanet der Andorianer, ein Eismond im Kuiper-Gürtel.",
      attributes: [
        { label: "System", value: "Procyon" },
        { label: "Status", value: "Mitglied" },
      ],
      characters: [],
      missions: [],
      setting: null,
      logDate: null,
      participants: [],
      location: null,
    },
  },
  {
    id: 2,
    slug: "shran",
    title: "Thy'lek Shran",
    category: "npc",
    tags: [],
    thumbnail: null,
    metadata: {
      summary: null,
      attributes: [{ label: "Spezies", value: "Andorianer" }],
      characters: [],
      missions: [],
      setting: null,
      logDate: null,
      participants: [],
      location: null,
    },
  },
  {
    id: 3,
    slug: "obsidianischer-orden",
    title: "Obsidianischer Orden",
    category: "faction",
    tags: ["Geheimdienst"],
    thumbnail: null,
    metadata: {
      summary: "Der cardassianische Geheimdienst — offiziell aufgelöst.",
      attributes: [],
      characters: [],
      missions: [],
      setting: null,
      logDate: null,
      participants: [],
      location: null,
    },
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
        {/* Das Eintragen-Fenster gehört zur Chronologie: auf der echten Seite
            steht der Knopf darüber, für alle mit `content.create`. Hier mit
            demselben Datum vorbelegt, das die Attrappen-Ereignisse als
            jüngstes führen. */}
        <ManualEventForm
          defaultDate={latestEventDate(DEMO_TIMELINE)}
          characters={[
            { id: 1, name: "Tuvok" },
            { id: 2, name: "Kira" },
          ]}
        />
        <TimelineView events={DEMO_TIMELINE} />
      </section>

      {/* Die Datenbank (/archive) mit Attrappen-Einträgen: sie trägt seit der
          Zusammenlegung dieselbe Zeile und dieselbe Karte wie die Chronologie
          darüber (ChronoRow/ChronoCard) — hier nebeneinander zu sehen. */}
      <section id="archive-list" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Datenbank</h2>
        <ArchiveEntryList entries={DEMO_ARCHIVE} />
      </section>

      {/* Die Charakterliste (/characters) mit Attrappen-Figuren: sie trägt
          seit der Zusammenlegung dieselbe Zeile und Karte, nur steht über
          jeder Gruppe der Status statt eines Monats oder Buchstabens. */}
      <section id="character-list" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Charaktere</h2>
        <CharacterPage characters={DEMO_CHARACTERS} canCreate />
      </section>

      {/* Portrait wählen und zuschneiden (Stammdaten der eigenen
          Charakterseite). Die echte Seite braucht Login und Datenbank; die
          Komponente selbst ist reine Client-Logik. */}
      <section id="portrait-picker" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Portrait-Zuschnitt</h2>
        <PortraitPicker idPrefix="gallery" />
      </section>

      <section className="flex flex-col gap-[10px]">
        <h2 className="lcars-text">DataRow</h2>
        <LcarsDataRow value="01" label="Erste Zeile" />
        <LcarsDataRow value="02" label="Zweite Zeile" href="/dev-gallery" />
      </section>
    </article>
  );
}
