import { Suspense } from "react";
import { getAllArchiveEntries } from "@/lib/archive";
import ArchiveCategoryNav from "./ArchiveCategoryNav";
import ArchiveCategoryNavSkeleton from "./ArchiveCategoryNavSkeleton";

// Persistentes Zwei-Spalten-Layout des Archivs: links die Kategorien-Navigation
// (bleibt beim Wechsel Liste ⇄ Eintrag erhalten), rechts die jeweilige Page
// (Eintrags-Liste der gewählten Kategorie bzw. Detailansicht eines Eintrags).
//
// Die Kategorien-Übersicht lädt ihre Zähler aus der DB — die Abfrage steckt
// bewusst in einer eigenen async-Komponente hinter <Suspense>, damit das
// Layout selbst nicht blockiert und stattdessen ein Skeleton (statt einer
// leeren Spalte) erscheint, solange geladen wird.
export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="archive-browser">
      <aside className="archive-browser-nav lcars-scroll">
        <Suspense fallback={<ArchiveCategoryNavSkeleton />}>
          <ArchiveCategoryNavLoader />
        </Suspense>
      </aside>
      <div className="archive-browser-main">{children}</div>
    </div>
  );
}

async function ArchiveCategoryNavLoader() {
  const entries = await getAllArchiveEntries();
  const navEntries = entries.map((e) => ({
    slug: e.slug,
    category: e.category,
  }));
  return <ArchiveCategoryNav entries={navEntries} />;
}
