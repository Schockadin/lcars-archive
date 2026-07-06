import { Suspense } from "react";
import { getAllArchiveEntries } from "@/lib/archive";
import ArchiveCategoryNav from "./ArchiveCategoryNav";

// Persistentes Zwei-Spalten-Layout des Archivs: links die Kategorien-Navigation
// (bleibt beim Wechsel Liste ⇄ Eintrag erhalten), rechts die jeweilige Page
// (Eintrags-Liste der gewählten Kategorie bzw. Detailansicht eines Eintrags).
export default async function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const entries = await getAllArchiveEntries();
  const navEntries = entries.map((e) => ({
    slug: e.slug,
    category: e.category,
  }));

  return (
    <div className="archive-browser">
      <aside className="archive-browser-nav lcars-scroll">
        <Suspense fallback={null}>
          <ArchiveCategoryNav entries={navEntries} />
        </Suspense>
      </aside>
      <div className="archive-browser-main">{children}</div>
    </div>
  );
}
