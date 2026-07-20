"use client";
import { useState } from "react";
import {
  LcarsDataRow,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import type { ChangelogEntry } from "@/lib/changelog";

// Zyklische Farbpaare pro Akkordeon-Zeile (Label-Pill-Hintergrund +
// Trenner-Akzent) — zwei unabhängige Paletten statt derselben Farbe für
// beides (anders als die Autor-Gruppen in MissionLogList.tsx), damit
// aufeinanderfolgende Versionen sich sowohl in der Pill- als auch in der
// Akzentfarbe unterscheiden.
const LABEL_COLORS = [
  "var(--lcars-purple)",
  "var(--lcars-blue)",
  "var(--lcars-green)",
  "var(--lcars-orange)",
  "var(--lcars-red)",
  "var(--lcars-amber)",
];
const ACCENT_COLORS = [
  "var(--lcars-amber)",
  "var(--lcars-red)",
  "var(--lcars-purple)",
  "var(--lcars-blue)",
  "var(--lcars-orange)",
  "var(--lcars-green)",
];

// Vergleicht zwei "Major.Minor"-Versionsstrings numerisch statt
// lexikografisch — ein reiner String-Vergleich würde "1.10" fälschlich vor
// "1.9" einsortieren.
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Umschaltbare Sortierung (neueste/älteste zuerst) über dieselbe
// Sortier-Switch-Komponente wie z.B. die Mission-Log-Liste — hier mit nur
// einer sortierbaren "Option" (Version), da es nur ein Sortierkriterium
// gibt. defaultOpen (nur das aktuellste Akkordeon offen) wird pro
// Versions-Key einmalig beim Mount gesetzt (siehe DataRow.tsx) — ein
// Wechsel der Sortierrichtung sortiert die Zeilen nur um, ohne die
// Auf-/Zugeklappt-Zustände zurückzusetzen, da React sie per key erhält.
export default function ChangelogList({
  entries,
}: {
  entries: ChangelogEntry[];
}) {
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const newestVersion = entries.reduce(
    (newest, entry) =>
      compareVersions(entry.version, newest) > 0 ? entry.version : newest,
    entries[0]?.version ?? "",
  );

  const sorted = [...entries].sort((a, b) =>
    sortDir === "desc"
      ? compareVersions(b.version, a.version)
      : compareVersions(a.version, b.version),
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <LcarsSortSwitch
        className="flex w-full ml-auto mb-[4px]"
        options={[{ key: "version", label: "Version" }]}
        sortKey="version"
        sortDir={sortDir}
        onChange={(_key, dir) => setSortDir(dir)}
      />

      <div className="flex flex-col gap-[10px]">
        {sorted.map((entry, i) => (
          <LcarsDataRow
            key={entry.version}
            value={entry.version}
            label="Version"
            color={LABEL_COLORS[i % LABEL_COLORS.length]}
            accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
            defaultOpen={entry.version === newestVersion}
            className="lcars-data-row--full"
          >
            <div className="lcars-text flex flex-col gap-[8px]">
              <h3>{entry.title}</h3>
              <p>{entry.summary}</p>
            </div>
          </LcarsDataRow>
        ))}
      </div>
    </div>
  );
}
