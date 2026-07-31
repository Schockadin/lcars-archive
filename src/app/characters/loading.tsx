import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Charakter-Übersicht. Bildet Überschrift,
// Sortier-Umschalter und gruppierte Charakter-Zeilen nach.
export default function Loading() {
  const groups = [
    { color: "var(--lcars-green)", rows: 4 },
    { color: "var(--lcars-amber)", rows: 3 },
    { color: "var(--lcars-red)", rows: 2 },
  ];

  return (
    <div className="flex flex-col items-start w-[var(--lcars-charpage-w)]">
      <div className="mb-[16px] flex w-full flex-col items-start gap-[12px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <div className="flex w-full gap-[10px]">
          <LcarsSkeleton className="h-[34px] flex-1 rounded-[var(--lcars-radius-pill)]" />
          <LcarsSkeleton className="h-[34px] flex-1 rounded-[var(--lcars-radius-pill)]" />
        </div>
      </div>

      {groups.map((group, i) => (
        <section key={i} className="mb-[20px] w-full">
          <LcarsSkeleton
            accent
            className="ml-[12px] mb-[8px] h-lcars-datarow w-[200px]"
            style={{ background: group.color, opacity: 0.5 }}
          />
          <div className="flex flex-col gap-[3px]">
            {Array.from({ length: group.rows }).map((_, r) => (
              <div key={r} className="flex h-[34px] items-stretch">
                <LcarsSkeleton
                  className="w-[60px] flex-shrink-0 rounded-l-[100vmax] rounded-r-none"
                  style={{ background: group.color, opacity: 0.5 }}
                />
                <LcarsSkeleton className="ml-[3px] flex-1 rounded-none" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
