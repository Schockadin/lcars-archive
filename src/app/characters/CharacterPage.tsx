"use client";
import { useState } from "react";
import Link from "next/link";
import {
  LcarsDataRow,
  LcarsSwitch,
  LcarsListFilterInput,
} from "@/components/lcars";
import type { CharacterListItem } from "@/lib/characters";
import {
  CHARACTER_STATUS_COLOR,
  CHARACTER_STATUS_LABEL,
  CHARACTER_STATUS_ORDER,
  type CharacterStatus,
} from "@/lib/characterFormat";

// ─── Konfiguration ──────────────────────────────────────────
// Zentrale Definition der Status-Gruppen: Reihenfolge, Label, Farbe.
// Beide Sortiermodi greifen auf dasselbe Farbschema zurück, damit
// die Optik konsistent bleibt.
const STATUS_GROUPS: {
  key: CharacterStatus;
  label: string;
  color: string;
}[] = CHARACTER_STATUS_ORDER.map((key) => ({
  key,
  label: CHARACTER_STATUS_LABEL[key],
  color: CHARACTER_STATUS_COLOR[key],
}));

// Generationen — Labels/Farben anpassen, sobald echte Phasennamen feststehen.
const GENERATIONS: { num: number; label: string; color: string }[] = [
  { num: 1, label: "Erste Generation", color: "var(--lcars-tertiary)" },
  { num: 2, label: "Zweite Generation", color: "var(--lcars-secondary)" },
  { num: 3, label: "Dritte Generation", color: "var(--lcars-quaternary)" },
];

// Lookup Map für Rank-Mapping
const RANK_MAP: Record<string, string> = {
  Ensign: "ENS",
  "Lieutenant Junior Grade": "LTJG",
  Lieutenant: "LT",
  "Lieutenant Commander": "LTC",
  Commander: "CDR",
  Captain: "CPT",
  Commodore: "COM",
  "Rear Admiral": "RADM",
  "Vice Admiral": "VADM",
  Admiral: "ADM",
};

type SortMode = "status" | "generation";

// ─── Hauptkomponente ────────────────────────────────────────
export default function CharacterPage({
  characters,
}: {
  characters: CharacterListItem[];
}) {
  const [mode, setMode] = useState<SortMode>("status");
  // Freitext-Filter über Name (und Rang) — grenzt vor der Gruppierung ein.
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredCharacters = q
    ? characters.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.metadata.rank ?? "").toLowerCase().includes(q),
      )
    : characters;

  const groups =
    mode === "status"
      ? STATUS_GROUPS.map((g) => ({
          label: g.label,
          color: g.color,
          items: filteredCharacters.filter((c) => c.status === g.key),
        }))
      : GENERATIONS.map((g) => ({
          label: g.label,
          color: g.color,
          // Ein Charakter kann in mehreren Generationen auftauchen
          // er erscheint in jeder zutreffenden Gruppe.
          items: filteredCharacters.filter((c) =>
            (c.metadata.generation ?? []).includes(g.num),
          ),
        }));

  return (
    <div className="flex flex-col items-start">
      <div className="mb-[16px] flex flex-col items-start w-full">
        <div className="flex w-full flex-wrap items-baseline justify-between gap-[8px]">
          <h1 className="lcars-data-row-heading">Charaktere</h1>
          {/* Einstieg in den Beziehungsgraph der Kampagne — er gehört zu den
              Charakteren, hat aber zu viel Fläche für diese Spalte. */}
          <Link href="/characters/beziehungen" className="lcars-wikilink">
            Beziehungen
          </Link>
        </div>
        <LcarsSwitch
          className="flex w-full"
          options={[
            { key: "status", label: "Status" },
            { key: "generation", label: "Generation" },
          ]}
          active={mode}
          onChange={setMode}
        />
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Charaktere filtern"
          className="mt-[8px] w-full max-w-[640px]"
        />
      </div>

      {filteredCharacters.length === 0 ? (
        <p className="lcars-empty-state">Keine Charaktere für diesen Filter.</p>
      ) : (
        groups.map(
          (group) =>
            group.items.length > 0 && (
              <section key={group.label} className="mb-[20px] w-full">
                <LcarsDataRow
                  value={group.items.length}
                  label={group.label}
                  accentColor={group.color}
                  color={group.color}
                  className="ml-auto"
                />
                <CharacterRows characters={group.items} color={group.color} />
              </section>
            ),
        )
      )}
    </div>
  );
}

// ─── Charakter-Zeilen ───────────────────────────────────────
// Klassisches LCARS-Muster: farbiger Stub + flache Daten-Leiste.
// Die Hover-Farbe wird per CSS-Variable injiziert, damit eine einzige
// .character-entry-Regel in globals.css für alle Gruppen funktioniert.
function CharacterRows({
  characters,
  color,
}: {
  characters: CharacterListItem[];
  color: string;
}) {
  return (
    <div className="mt-[8px] flex flex-col gap-[3px]">
      {characters.map((c) => (
        <Link
          key={c.id}
          href={`/characters/${c.slug}`}
          className="character-entry"
          style={
            {
              "--entry-color": color,
            } as React.CSSProperties
          }
        >
          <span className="character-entry-stub">
            {String(c.id).padStart(3, "0")}
          </span>
          <span className="character-entry-bar">
            <span className="character-entry-name">{c.name}</span>
            {c.metadata.rank && (
              <span className="character-entry-rank">
                {RANK_MAP[c.metadata.rank]}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
