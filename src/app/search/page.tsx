import { Suspense } from "react";
import { searchFull } from "@/lib/search";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { hasRagConfig } from "@/lib/rag";
import PageMeta from "@/components/PageMeta";
import SearchResultsView from "./SearchResultsView";
import RagChat from "@/app/rag/RagChat";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import { PublicSearchGuide } from "@/components/help/guides/PublicGuides";
import { LcarsSkeleton } from "@/components/lcars";

export const metadata = { title: { default: "Suche" } };

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <>
      <PageMeta title="Suche" section="search" />
      <div className="lcars-wide-column">
        <div className="mb-[16px]">
          <HelpTitleRow
            help={
              <HelpButton title="Suche" tutorial="seiten-im-ueberblick">
                <PublicSearchGuide />
              </HelpButton>
            }
          >
            <h1 className="lcars-data-row-heading">Suche</h1>
          </HelpTitleRow>
          <p className="lcars-eyebrow">Datenbank durchsuchen</p>
        </div>
        <Suspense fallback={<SearchFormFallback />}>
          <SearchForm searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<ResultsFallback />}>
          <SearchContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

function SearchContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Request-time session access starts under this outer Suspense boundary;
  // both dynamic regions share its promise.
  const viewerPromise = getViewer();
  return (
    <>
      <Suspense fallback={<ResultsFallback />}>
        <SearchResults
          searchParams={searchParams}
          viewerPromise={viewerPromise}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SearchAssistant viewerPromise={viewerPromise} />
      </Suspense>
    </>
  );
}
function SearchFormFallback() {
  return (
    <form
      action="/search"
      method="get"
      className="mb-[16px] flex flex-col gap-[8px] sm:flex-row"
    >
      <input
        type="search"
        name="q"
        placeholder="Datenbank durchsuchen…"
        className="lcars-input flex-1 rounded-lcars-pill"
        style={{ minWidth: 0 }}
      />
      <button
        type="submit"
        className="lcars-pill-btn--outline w-full sm:w-auto"
      >
        Suchen
      </button>
    </form>
  );
}
function ResultsFallback() {
  return (
    <div
      className="archive-entry-list"
      aria-label="Suchergebnisse werden geladen"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <LcarsSkeleton key={i} className="h-[92px] w-full" />
      ))}
    </div>
  );
}

async function SearchForm({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  return (
    <form
      action="/search"
      method="get"
      className="mb-[16px] flex flex-col gap-[8px] sm:flex-row"
    >
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Datenbank durchsuchen…"
        className="lcars-input flex-1 rounded-lcars-pill"
        style={{ minWidth: 0 }}
      />
      <button
        type="submit"
        className="lcars-pill-btn--outline w-full sm:w-auto"
      >
        Suchen
      </button>
    </form>
  );
}

async function SearchResults({
  searchParams,
  viewerPromise,
}: {
  searchParams: Promise<{ q?: string }>;
  viewerPromise: ReturnType<typeof getViewer>;
}) {
  const [{ q: rawQuery }, viewer] = await Promise.all([
    searchParams,
    viewerPromise,
  ]);
  const q = rawQuery?.trim() ?? "";
  if (!q) return <p className="lcars-empty-state">Suchbegriff eingeben.</p>;
  if (q.length < 2)
    return <p className="lcars-empty-state">Mindestens 2 Zeichen eingeben.</p>;

  // Open conversations are visible only to their participants and the GM.
  // Keep the authoritative viewer check ahead of the protected search query.
  const searchViewer = viewer
    ? {
        userId: viewer.userId,
        isGm: viewerHasPermission(viewer, "gm.access"),
      }
    : null;
  const results = await searchFull(q, searchViewer);
  return (
    <>
      <p className="lcars-eyebrow mb-[12px]">Ergebnisse für „{q}“</p>
      <SearchResultsView
        key={q}
        query={q}
        results={results}
        isLoggedIn={viewer != null}
      />
    </>
  );
}

async function SearchAssistant({
  viewerPromise,
}: {
  viewerPromise: ReturnType<typeof getViewer>;
}) {
  const viewer = await viewerPromise;
  if (!viewerHasPermission(viewer, "rag.use")) return null;
  return (
    <section className="mt-[32px] border-t border-lcars-border pt-[24px]">
      <div className="mb-[16px]">
        <h2 className="lcars-data-row-heading">Datenbank-Assistent</h2>
        <p className="lcars-eyebrow">
          Fragen an den Kampagnen-Datenbestand stellen
        </p>
      </div>
      <RagChat configured={hasRagConfig()} />
    </section>
  );
}
