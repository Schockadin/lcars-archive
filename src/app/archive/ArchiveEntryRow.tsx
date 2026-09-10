import type { ArchiveEntryPreview } from "@/types/archive";
import { CATEGORY_CONFIG } from "@/lib/archiveFormat";
import ChronoRow from "@/components/timeline/ChronoRow";
import ArchiveEntryCard from "./ArchiveEntryCard";

// Der Kartenanteil der alphabetischen Übersicht: dieselbe Zeile wie in der
// Chronologie (ChronoRow), nur ohne Datumsspalte — die Buchstaben stehen als
// Perioden darüber in ArchiveEntryList.
export default function ArchiveEntryRow({
  entry,
}: {
  entry: ArchiveEntryPreview;
}) {
  return (
    <ChronoRow color={CATEGORY_CONFIG[entry.category].color}>
      <ArchiveEntryCard entry={entry} />
    </ChronoRow>
  );
}
