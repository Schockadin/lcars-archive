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
import { DEFAULT_ADVANCEMENT_RULES } from "@/lib/advancement";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import type { Talent } from "@/lib/talentCatalog";

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
            }}
            downloadUrl="/api/export/character-sheet?id=1"
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </section>

      <section className="flex flex-col gap-[10px]">
        <h2 className="lcars-text">DataRow</h2>
        <LcarsDataRow value="01" label="Erste Zeile" />
        <LcarsDataRow value="02" label="Zweite Zeile" href="/dev-gallery" />
      </section>
    </article>
  );
}
