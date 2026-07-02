import { searchFull } from "@/lib/search";
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
  const results = q.length >= 2 ? await searchFull(q) : [];

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

        {q.length === 0 ? (
          <p className="char-file-bio-empty">
            Oben im Header einen Suchbegriff eingeben.
          </p>
        ) : q.length < 2 ? (
          <p className="char-file-bio-empty">Mindestens 2 Zeichen eingeben.</p>
        ) : (
          // key={q}: neue Suche über den Header → eigene Filter-/Sort-State-
          // Instanz, statt den Zustand der vorherigen Suche (z.B. Typ-Filter)
          // stillschweigend beizubehalten (client-seitige Navigation
          // rendert sonst dieselbe SearchResultsView-Instanz weiter).
          <SearchResultsView key={q} query={q} results={results} />
        )}
      </div>
    </>
  );
}
