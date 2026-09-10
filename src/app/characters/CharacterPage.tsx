"use client";
import { useState } from "react";
import Link from "next/link";
import { LcarsSwitch, LcarsListFilterInput } from "@/components/lcars";
import ChronoRow from "@/components/timeline/ChronoRow";
import ChronoCard from "@/components/timeline/ChronoCard";
import type { CharacterListItem } from "@/lib/characters";
import {
  CHARACTER_STATUS_COLOR,
  CHARACTER_STATUS_LABEL,
  CHARACTER_STATUS_ORDER,
  type CharacterStatus,
} from "@/lib/characterFormat";
import { characterHref } from "@/lib/contentRoutes";
import { PlusIcon } from "@/lib/icons";

// Die Charakterliste (/characters) — dieselbe Liste wie Chronologie und
// Datenbank: Schiene mit Punkt (ChronoRow, ohne Datumsspalte), Aktenkarte
// (ChronoCard) und eine Gruppen-Überschrift darüber. Wo die Chronologie den
// Monat und die Datenbank den Buchstaben schreibt, steht hier der Status —
// „Aktiv", „Inaktiv", „Verstorben" — bzw. die Generation.
//
// Vorher waren es eigene, flache Zeilen (.character-entry: farbiger Stub +
// Balken) und die Gruppen standen als LcarsDataRow darüber. Drei Übersichten,
// drei Bauweisen — jetzt eine.

// Zentrale Definition der Status-Gruppen: Reihenfolge, Label, Farbe.
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

// Rang-Kürzel für das Etikett der Karte — dort ist Platz für drei bis vier
// Zeichen, nicht für „Lieutenant Junior Grade".
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
          // Ein Charakter kann in mehreren Generationen auftauchen —
          // er erscheint in jeder zutreffenden Gruppe.
          items: filteredCharacters.filter((c) =>
            (c.metadata.generation ?? []).includes(g.num),
          ),
        }));

  return (
    <div className="lcars-wide-column">
      <div className="mb-[16px]">
        <div className="flex w-full flex-wrap items-baseline justify-between gap-[8px]">
          <h1 className="lcars-data-row-heading">Charaktere</h1>
          {/* Einstieg in den Beziehungsgraph der Kampagne — er gehört zu den
              Charakteren, hat aber zu viel Fläche für diese Seite. */}
          <Link href="/characters/beziehungen" className="lcars-wikilink">
            Beziehungen
          </Link>
        </div>
        <p className="lcars-eyebrow">
          Das Ensemble der Kampagne ·{" "}
          {mode === "status" ? "nach Status" : "nach Generation"}
        </p>
      </div>

      <div className="lcars-toolbar">
        {/* Dieselbe Stelle wie „Ereignis eintragen" in der Chronologie und
            „Eintrag anlegen" in der Datenbank: der Knopf, der etwas Neues
            beginnt, steht links vor den Filtern. */}
        <Link
          href="/user/characters/new"
          className="lcars-icon-btn self-start"
          aria-label="Charakter anlegen"
          title="Charakter anlegen"
        >
          <PlusIcon />
        </Link>

        <LcarsSwitch
          className="flex"
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
        />
      </div>

      {filteredCharacters.length === 0 ? (
        <p className="lcars-empty-state">Keine Charaktere für diesen Filter.</p>
      ) : (
        <>
          <div className="archive-entry-list">
            {groups.map(
              (group) =>
                group.items.length > 0 && (
                  <div key={group.label} className="contents">
                    <h2 className="timeline-period archive-letter-period">
                      {group.label}
                    </h2>
                    {group.items.map((character) => (
                      <ChronoRow key={character.id} color={group.color}>
                        <CharacterCard
                          character={character}
                          color={group.color}
                        />
                      </ChronoRow>
                    ))}
                  </div>
                ),
            )}
          </div>
          <p className="lcars-eyebrow mt-[12px]">
            {filteredCharacters.length === characters.length
              ? `${characters.length} Charaktere`
              : `${filteredCharacters.length} von ${characters.length} Charakteren`}
          </p>
        </>
      )}
    </div>
  );
}

// Eine Charakterkarte: Rang-Kürzel als Etikett, der Name als Titel, darunter
// Spezies, Zugehörigkeit und Spieler — die Angaben, nach denen am Tisch
// gefragt wird. Die Farbe ist die der Gruppe (Status bzw. Generation).
function CharacterCard({
  character,
  color,
}: {
  character: CharacterListItem;
  color: string;
}) {
  const m = character.metadata;
  const affiliation = [
    ...(m.affiliation?.ships ?? []),
    ...(m.affiliation?.factions ?? []),
  ];

  return (
    <ChronoCard
      color={color}
      tag={m.rank ? (RANK_MAP[m.rank] ?? m.rank) : undefined}
      title={character.name}
      href={characterHref(character.slug)}
      ariaLabel={m.rank ? `${character.name} — ${m.rank}` : character.name}
      meta={
        <>
          {m.species.length > 0 && (
            <span>
              <b>Spezies</b> {m.species.join(" / ")}
            </span>
          )}
          {affiliation.length > 0 && (
            <span>
              <b>Zugehörigkeit</b> {affiliation.join(", ")}
            </span>
          )}
          {m.player && (
            <span>
              <b>Spieler</b> {m.player}
            </span>
          )}
        </>
      }
    />
  );
}
