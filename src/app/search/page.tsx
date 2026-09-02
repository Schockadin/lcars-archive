import { searchFull } from "@/lib/search";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { hasRagConfig } from "@/lib/rag";
import PageMeta from "@/components/PageMeta";
import SearchResultsView from "./SearchResultsView";
import RagChat from "@/app/rag/RagChat";

export const metadata = {
  title: {
    default: "Suche",
  },
};


export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const viewer = await getViewer();
  const results = q.length >= 2 ? await searchFull(q, viewer?.userId) : [];
  // Der Archiv-Assistent (RAG) erscheint unter der Volltextsuche — nur für
  // Berechtigte (rag.use). configured spiegelt, ob die API-Schlüssel gesetzt
  // sind (sonst zeigt RagChat einen Hinweis statt des Eingabefelds).
  const canUseRag = viewerHasPermission(viewer, "rag.use");

  return (
    <>
      <PageMeta title="Suche" section="search" />
      <div className="w-full max-w-[640px]">
        <div className="mb-[16px]">
          <h1 className="lcars-data-row-heading">Suche</h1>
          <p className="lcars-eyebrow">
            {q ? `Ergebnisse für „${q}“` : "Datenbank durchsuchen"}
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
            placeholder="Datenbank durchsuchen…"
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

        {/* Datenbank-Assistent (RAG) unterhalb der Volltextsuche — nur für
            Berechtigte. Die eigenständige Seite /rag bleibt zusätzlich
            bestehen (gleiche Komponente). */}
        {canUseRag ? (
          <section className="mt-[32px] border-t border-lcars-border pt-[24px]">
            <div className="mb-[16px]">
              <h2 className="lcars-data-row-heading">Datenbank-Assistent</h2>
              <p className="lcars-eyebrow">
                Fragen an den Kampagnen-Datenbestand stellen
              </p>
            </div>
            <RagChat configured={hasRagConfig()} />
          </section>
        ) : null}
      </div>
    </>
  );
}
