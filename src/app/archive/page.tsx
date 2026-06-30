import { getAllArchiveEntries } from "@/lib/archive";
import PageMeta from "@/components/PageMeta";
import ArchiveOverview from "./ArchiveOverview";

export const metadata = {
  title: {
    default: "Archiv",
  },
};

export default async function ArchivePage() {
  const entries = await getAllArchiveEntries();
  return (
    <>
      <PageMeta title="Archiv" section="archive" />
      <ArchiveOverview entries={entries} />
    </>
  );
}
