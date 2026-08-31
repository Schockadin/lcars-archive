"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { ArchiveCategory } from "@/types/archive";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";
import { LcarsDataRow } from "@/components/lcars";

// Linke, persistente Kategorien-Liste der Archiv-Übersicht. Die aktive
// Kategorie wird aus ?cat= ermittelt — oder, auf einer Detailseite, aus der
// Kategorie des angezeigten Eintrags.
export default function ArchiveCategoryNav({
  entries,
}: {
  entries: { slug: string; category: ArchiveCategory }[];
}) {
  const pathname = usePathname();
  const search = useSearchParams();

  // /archive/[slug] → aktiver Eintrag = zweites Pfadsegment
  const segs = pathname.split("/").filter(Boolean);
  const activeSlug =
    segs[0] === "archive" && segs.length >= 2
      ? decodeURIComponent(segs[1])
      : null;

  const catParam = search.get("cat");
  const activeCategory: ArchiveCategory | null =
    (catParam as ArchiveCategory | null) ??
    entries.find((e) => e.slug === activeSlug)?.category ??
    null;

  // "dialogue" wird hier ausgeblendet — Gespräche sind in den
  // Charaktere-Bereich umgezogen (/characters/dialogues) und über das Archiv
  // nicht mehr als eigene Kategorie durchsuchbar.
  const cats = CATEGORY_ORDER.filter((cat) => cat !== "dialogue")
    .map((cat) => ({
      cat,
      ...CATEGORY_CONFIG[cat],
      count: entries.filter((e) => e.category === cat).length,
    }))
    .filter((c) => c.count > 0);

  return (
    <nav className="h-full">
      <div className="mt-[20px] lcars-heading">Kategorien</div>

      <div className="archive-cat-list">
        {cats.map((c) => (
          <LcarsDataRow
            value={c.count}
            label={c.plural}
            href={`/archive?cat=${c.cat}`}
            data-active={activeCategory === c.cat ? "true" : "false"}
            color={c.color}
            accentColor="var(--lcars-primary-light)"
            key={c.cat}
          />
        ))}
      </div>
    </nav>
  );
}
