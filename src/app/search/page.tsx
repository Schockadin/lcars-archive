import Link from "next/link";
import { searchFull } from "@/lib/search";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import PageMeta from "@/components/PageMeta";
import SearchResultsView from "./SearchResultsView";

export const metadata = {
  title: {
    default: "Suche",
  },
};

// Hängt am ?q=-Parameter — wie /api/search immer frisch ausliefern.
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const viewer = await getViewer();
  const results = q.length >= 2 ? await searchFull(q, viewer?.userId) : [];

  return (
    <>
      <PageMeta title="Suche" section="search" />
      <div className="w-full max-w-[640px]">
        <div className="mb-[16px]">
          <h1 className="lcars-data-row-heading">Suche</h1>
          <p className="lcars-eyebrow">
            {q ? `Ergebnisse für „${q}“` : "Archiv durchsuchen"}
          </p>
        </div>

        {/* Reines GET-Formular statt der Autovervollständigung im Header
            (HeaderSearch.tsx) — navigiert bei Submit direkt zu ?q=…, ohne
            Live-Vorschau während des Tippens. */}
        <form
          action="/search"
          method="get"
          className="flex flex-col sm:flex-row gap-[8px] mb-[16px]"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Archiv durchsuchen…"
            className="rounded-lcars-pill lcars-input flex-1"
            style={{ minWidth: 0 }}
          />
          <button
            type="submit"
            className="lcars-pill-btn--outline w-full sm:w-auto"
          >
            Suchen
          </button>
        </form>

        {/* Einstieg zum RAG-Assistenten — nur für Berechtigte (rag.use); die
            /rag-Seite selbst gated zusätzlich (forbidden). */}
        {viewerHasPermission(viewer, "rag.use") ? (
          <p className="lcars-eyebrow mb-[16px]">
            Lieber eine Frage stellen?{" "}
            <Link href="/rag" className="lcars-text-data">
              Zum Archiv-Assistenten
            </Link>
          </p>
        ) : null}

        {q.length === 0 ? (
          <p className="lcars-empty-state">Suchbegriff eingeben.</p>
        ) : q.length < 2 ? (
          <p className="lcars-empty-state">Mindestens 2 Zeichen eingeben.</p>
        ) : (
          // key={q}: neue Suche über den Header → eigene Filter-/Sort-State-
          // Instanz, statt den Zustand der vorherigen Suche (z.B. Typ-Filter)
          // stillschweigend beizubehalten (client-seitige Navigation
          // rendert sonst dieselbe SearchResultsView-Instanz weiter).
          <SearchResultsView
            key={q}
            query={q}
            results={results}
            isLoggedIn={viewer != null}
          />
        )}
      </div>
    </>
  );
}
