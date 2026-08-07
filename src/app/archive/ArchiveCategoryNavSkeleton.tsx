import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Kategorien-Übersicht (linke Spalte des Archiv-Browsers,
// siehe ArchiveCategoryNav.tsx) — wird angezeigt, während die Kategorien-Zähler
// aus der DB geladen werden (Suspense-Fallback in archive/layout.tsx). Bildet
// die Überschrift „Kategorien" plus eine Reihe DataRow-hoher Platzhalter nach.
export default function ArchiveCategoryNavSkeleton() {
  return (
    <nav className="h-full" aria-hidden="true">
      <div className="mt-[20px] lcars-heading">Kategorien</div>
      <div className="archive-cat-list">
        {Array.from({ length: 7 }).map((_, i) => (
          <LcarsSkeleton
            key={i}
            className="h-lcars-datarow w-full rounded-none"
          />
        ))}
      </div>
    </nav>
  );
}
