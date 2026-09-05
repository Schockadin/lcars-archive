"use client";
import Link from "next/link";
import ChangelogControls from "@/components/changelog/ChangelogControls";
import ChangelogItems from "@/components/changelog/ChangelogItems";
import { useChangelogView } from "@/components/changelog/useChangelogView";
import type { ChangelogEntry } from "@/lib/changelog";

// Der Inhalt der Dashboard-Box „Neue Funktionen": dieselbe Leiste aus
// Sortierung und Kategorie-Filter wie unter /changelog, darunter die
// ausgewählten Versionen untereinander.
//
// Was hier ankommt, ist bereits um die für die Rolle ausgeblendeten
// Kategorien erleichtert (siehe ChangelogSection.tsx) — die Bedienung hier
// filtert also innerhalb dessen, was diese Person überhaupt sehen soll.
export default function ChangelogFeatureList({
  entries,
}: {
  entries: ChangelogEntry[];
}) {
  const view = useChangelogView(entries);

  return (
    <div id="changelog" className="lcars-text flex flex-col gap-[16px]">
      <ChangelogControls
        categories={view.categories}
        selected={view.selected}
        onSelectCategory={view.selectCategory}
        sortKey={view.sortKey}
        sortDir={view.sortDir}
        onSortChange={view.setSort}
        idPrefix="dashboard"
      />

      {view.visible.length === 0 ? (
        <p className="lcars-empty-state">Keine Neuerungen für diese Auswahl.</p>
      ) : (
        view.visible.map((entry) => (
          <div key={entry.version} className="flex flex-col gap-[8px]">
            <h2>
              {entry.title}{" "}
              <span className="text-lcars-ink-dim font-lcars-mono text-[14px]">
                · Version {entry.version}
              </span>
            </h2>
            <ChangelogItems items={entry.items} />
          </div>
        ))
      )}

      <p>
        <Link href="/changelog" className="underline">
          Alle Änderungen ansehen
        </Link>
      </p>
    </div>
  );
}
