// Die Datenbank ist eine vollständige Übersicht. Details werden direkt unter
// derselben Route gerendert; eine persistente Kategorienleiste ist durch den
// Filter in der Übersicht nicht mehr nötig.
export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}