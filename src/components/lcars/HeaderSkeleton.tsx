import LcarsSkeleton from "./Skeleton";

// Platzhalter für die Header-UserNav, solange die Session client-seitig geladen
// wird (siehe HeaderContent.tsx) — statt eines leeren Kastens ein Pillen-Raster
// im selben Layout wie die echte UserNav (.lcars-usernav), damit der Header
// beim Laden nicht „leer" wirkt und der Wechsel zur fertigen Navigation ohne
// großen Sprung passiert. Rein dekorativ (aria-hidden).
export default function HeaderSkeleton({
  columns = 3,
  count = 5,
}: {
  columns?: number;
  count?: number;
}) {
  return (
    <nav
      className="lcars-usernav"
      style={{ "--usernav-cols": columns } as React.CSSProperties}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <LcarsSkeleton
          key={i}
          className="h-[48px] w-full rounded-lcars-pill"
        />
      ))}
    </nav>
  );
}
