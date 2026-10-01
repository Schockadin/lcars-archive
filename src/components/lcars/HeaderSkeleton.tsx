import LcarsSkeleton from "./Skeleton";

const HEADER_SKELETON_SLOTS = [
  "profile",
  "rules",
  "gm",
  "admin",
  "help",
  "logout",
];

// Platzhalter für die Header-UserNav, solange die Session client-seitig geladen
// wird (siehe HeaderContent.tsx) — statt eines leeren Kastens ein Pillen-Raster
// im selben Layout wie die echte UserNav (.lcars-usernav), damit der Header
// beim Laden nicht „leer" wirkt und der Wechsel zur fertigen Navigation ohne
// großen Sprung passiert. Rein dekorativ (aria-hidden).
export default function HeaderSkeleton({
  columns = 3,
  count = 6,
}: {
  columns?: number;
  count?: number;
}) {
  return (
    <nav
      className="lcars-usernav lcars-usernav--header"
      style={{ "--usernav-cols": columns } as React.CSSProperties}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <LcarsSkeleton
          key={i}
          className={`w-full rounded-lcars-pill lcars-usernav-slot--${HEADER_SKELETON_SLOTS[i] ?? "extra"}`}
          // Gleiche (responsive) Pillen-Höhe wie die echte UserNav
          // (--usernav-pill-h, siehe header.css), damit der Wechsel nicht
          // springt und auf Mobile ebenfalls flacher ausfällt.
          style={{ height: "var(--usernav-pill-h, 48px)" }}
        />
      ))}
    </nav>
  );
}
