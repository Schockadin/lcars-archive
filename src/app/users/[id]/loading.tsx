import PageSkeleton from "@/app/_shared/PageSkeleton";

// Route-Skelett während des Server-Roundtrips der öffentlichen Profilseite
// (siehe PageSkeleton) — damit die Navigation nicht „leer" wirkt, während die
// öffentlichen Inhalte des Users (Charaktere/Berichte/Gespräche/Archiv) laden.
export default function Loading() {
  return <PageSkeleton rows={6} />;
}
