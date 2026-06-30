"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArchiveCategory } from "@/types/archive";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";

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

  const cats = CATEGORY_ORDER.map((cat) => ({
    cat,
    ...CATEGORY_CONFIG[cat],
    count: entries.filter((e) => e.category === cat).length,
  })).filter((c) => c.count > 0);

  return (
    <nav className="archive-nav">
      <div className="mission-loglist-head">
        <Link href="/archive" className="mission-loglist-back">
          Archiv
        </Link>
      </div>
      <p className="mission-logs-sub">Kategorien</p>

      <div className="archive-cat-list">
        {cats.map((c) => (
          <Link
            key={c.cat}
            href={`/archive?cat=${c.cat}`}
            className="archive-cat"
            data-active={activeCategory === c.cat ? "true" : "false"}
            style={{ "--cat-color": c.color } as React.CSSProperties}
          >
            <span className="archive-cat-count">{c.count}</span>
            <span className="archive-cat-label">{c.plural}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
