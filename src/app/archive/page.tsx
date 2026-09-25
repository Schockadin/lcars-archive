import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAllArchiveEntries } from "@/lib/archive";
import { isArchiveCategory } from "@/lib/archiveFormat";
import PageMeta from "@/components/PageMeta";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import { dialoguesHref } from "@/lib/contentRoutes";
import ArchiveEntryList from "./ArchiveEntryList";
import ArchiveEntryCreateOverlay from "./ArchiveEntryCreateOverlay";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import { PublicDatabaseGuide } from "@/components/help/guides/PublicGuides";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import { LcarsSkeleton } from "@/components/lcars";
import type { ArchiveEntryPreview } from "@/types/archive";

export const metadata = { title: { default: "Datenbank" } };

export default function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; participant?: string }>;
}) {
  return (
    <>
      <PageMeta title="Datenbank" section="archive" />
      <div className="lcars-wide-column">
        <HelpTitleRow
          help={
            <HelpButton title="Datenbank" tutorial="seiten-im-ueberblick">
              <PublicDatabaseGuide />
            </HelpButton>
          }
        >
          <h1 className="lcars-data-row-heading">Datenbank</h1>
        </HelpTitleRow>
        <p className="lcars-eyebrow mb-2">Enzyklopädie der bekannten Welt</p>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <ArchiveContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function ArchiveContent({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; participant?: string }>;
}) {
  const { cat } = await searchParams;
  if (cat === "dialogue") redirect(dialoguesHref());
  const initialCategory = cat && isArchiveCategory(cat) ? cat : null;
  return (
    <>
      <div className="lcars-toolbar">
        <Suspense
          fallback={
            <LcarsSkeleton className="h-[34px] w-[40px] rounded-[100vmax]" />
          }
        >
          <CreateArchiveAction initialCategory={initialCategory} />
        </Suspense>
      </div>
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <ArchiveList initialCategory={initialCategory} />
      </Suspense>
    </>
  );
}

async function ArchiveList({
  initialCategory,
}: {
  initialCategory: ArchiveEntryPreview["category"] | null;
}) {
  const entries = await getAllArchiveEntries();
  return (
    <ArchiveEntryList
      key={initialCategory ?? "all"}
      entries={entries}
      initialCategory={initialCategory}
    />
  );
}

async function CreateArchiveAction({
  initialCategory,
}: {
  initialCategory: ArchiveEntryPreview["category"] | null;
}) {
  const viewer = await getViewer();
  if (!viewer || !viewerHasPermission(viewer, "content.create")) return null;
  const createCategory =
    initialCategory === "dialogue" ? "other" : (initialCategory ?? "other");
  return (
    <ArchiveEntryCreateOverlay
      userId={viewer.userId}
      initialCategory={createCategory}
    />
  );
}
