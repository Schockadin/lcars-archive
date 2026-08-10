import PageSkeleton from "@/app/_shared/PageSkeleton";

// Skelett der rechten Archiv-Spalte (Kategorie-Liste) während des Server-
// Roundtrips. Die linke Kategorie-Navigation lebt im Layout und bleibt beim
// Navigieren erhalten — hier nur der wechselnde Listen-Bereich.
export default function Loading() {
  return <PageSkeleton rows={6} />;
}
