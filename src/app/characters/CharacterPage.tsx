"use client";
import { useState } from "react";
import Link from "next/link";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LcarsDataRow, LcarsSwitch } from "@/components/lcars";
import { Character } from "@/types/character";

// ─── Konfiguration ──────────────────────────────────────────
// Zentrale Definition der Status-Gruppen: Reihenfolge, Label, Farbe.
// Beide Sortiermodi greifen auf dasselbe Farbschema zurück, damit
// die Optik konsistent bleibt.
const STATUS_GROUPS: {
  key: Character["status"];
  label: string;
  color: string;
}[] = [
  { key: "active", label: "Aktiv", color: "var(--lcars-green)" },
  { key: "retired", label: "Ehemalig", color: "var(--lcars-amber)" },
  { key: "deceased", label: "Verstorben", color: "var(--lcars-red)" },
];

// Generationen — Labels/Farben anpassen, sobald echte Phasennamen feststehen.
const GENERATIONS: { num: number; label: string; color: string }[] = [
  { num: 1, label: "Erste Generation", color: "var(--lcars-blue)" },
  { num: 2, label: "Zweite Generation", color: "var(--lcars-purple)" },
  { num: 3, label: "Dritte Generation", color: "var(--lcars-orange)" },
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
  characters: Character[];
}) {
  usePageMeta("Charaktere", "characters");
  const [mode, setMode] = useState<SortMode>("status");

  const groups =
    mode === "status"
      ? STATUS_GROUPS.map((g) => ({
          label: g.label,
          color: g.color,
          items: characters.filter((c) => c.status === g.key),
        }))
      : GENERATIONS.map((g) => ({
          label: g.label,
          color: g.color,
          // Ein Charakter kann in mehreren Generationen auftauchen
          // er erscheint in jeder zutreffenden Gruppe.
          items: characters.filter((c) =>
            (c.metadata.generation ?? []).includes(g.num),
          ),
        }));

  return (
    <div className="flex flex-col items-start w-[var(--lcars-charpage-w)]">
      <div className="mb-[16px] flex flex-col items-start w-full">
        <h1 className="lcars-data-row-heading">Charaktere</h1>
        <LcarsSwitch
          className="flex w-full"
          options={[
            { key: "status", label: "Status" },
            { key: "generation", label: "Generation" },
          ]}
          active={mode}
          onChange={setMode}
        />
      </div>

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.label} className="mb-[20px]">
              <LcarsDataRow
                value={group.items.length}
                label={group.label}
                accentColor={group.color}
                color={group.color}
                className="ml-[12px]"
              />
              <CharacterRows characters={group.items} color={group.color} />
            </section>
          ),
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
  characters: Character[];
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
