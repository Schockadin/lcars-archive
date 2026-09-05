import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Missions-Übersicht: Zeitstrahl-Zeilen wie in der
// Chronologie (Datum · Schiene · Akte), damit beim Nachladen nichts springt.
export default function Loading() {
  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px] flex flex-col gap-[8px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <LcarsSkeleton className="h-[14px] w-[320px]" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="timeline-event">
          <div className="timeline-date" aria-hidden="true">
            <LcarsSkeleton className="ml-auto h-[11px] w-[46px]" />
            <LcarsSkeleton className="mt-[3px] ml-auto h-[13px] w-[34px]" />
          </div>
          <div className="timeline-rail" aria-hidden="true">
            <span className="timeline-dot" />
          </div>
          <div
            className="mission-akte flex w-full overflow-hidden"
            style={{ background: "var(--lcars-surface)" }}
          >
            <LcarsSkeleton
              accent
              className="w-[9px] flex-shrink-0 rounded-none"
            />
            <div className="flex-1 px-[16px] pt-[11px] pb-[13px]">
              <LcarsSkeleton className="h-[21px] w-[60%]" />
              <LcarsSkeleton className="mt-[8px] h-[13px] w-full" />
              <LcarsSkeleton className="mt-[4px] h-[13px] w-[80%]" />
              <div className="mt-[10px] flex gap-[16px]">
                <LcarsSkeleton className="h-[11px] w-[70px]" />
                <LcarsSkeleton className="h-[11px] w-[110px]" />
                <LcarsSkeleton className="h-[11px] w-[50px]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
