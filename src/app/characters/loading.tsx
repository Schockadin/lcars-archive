import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Charakter-Übersicht — dieselbe Form wie die Liste
// selbst (Kopfzeile, Toolbar, Status-Gruppen aus Schiene + Karte).
export default function Loading() {
  const groups = [
    { color: "var(--lcars-tertiary)", rows: 4 },
    { color: "var(--lcars-primary)", rows: 3 },
    { color: "var(--lcars-quinary)", rows: 2 },
  ];

  return (
    <div className="lcars-wide-column">
      <div className="mb-[16px] flex flex-col items-start gap-[10px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <div className="flex w-full gap-[10px]">
          <LcarsSkeleton className="h-[34px] w-[40px] rounded-[100vmax]" />
          <LcarsSkeleton className="h-[34px] flex-1 rounded-[var(--lcars-radius-pill)]" />
          <LcarsSkeleton className="h-[34px] flex-1 rounded-[var(--lcars-radius-pill)]" />
        </div>
      </div>

      <div className="archive-entry-list">
        {groups.map((group, i) => (
          <div key={i} className="contents">
            <LcarsSkeleton className="mb-[10px] mt-[22px] h-[14px] w-[160px]" />
            {Array.from({ length: group.rows }).map((_, r) => (
              <div key={r} className="timeline-event timeline-event-undated">
                <div className="timeline-rail" aria-hidden="true">
                  <span className="timeline-dot" />
                </div>
                <LcarsSkeleton
                  className="mb-[12px] h-[74px] rounded-[4px_14px_14px_4px]"
                  style={{ background: group.color, opacity: 0.5 }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
