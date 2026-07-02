import { Fragment } from "react";
import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Timeline-Chronik: Jahres-Rail + gestapelte Akten im
// selben Grid-Layout wie TimelineView.tsx.
export default function Loading() {
  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px] flex flex-col gap-[8px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <LcarsSkeleton className="h-[14px] w-[320px]" />
      </div>

      <div className="timeline-chronik">
        {Array.from({ length: 4 }).map((_, i) => (
          <Fragment key={i}>
            <div className="timeline-rail-cell" aria-hidden="true">
              {i === 0 && <LcarsSkeleton accent className="h-[24px] w-[48px]" />}
            </div>
            <div
              className="flex w-full overflow-hidden rounded-[4px_14px_14px_4px]"
              style={{ background: "var(--lcars-surface)" }}
            >
              <LcarsSkeleton accent className="w-[9px] flex-shrink-0 rounded-none" />
              <div className="flex-1 px-[16px] pt-[11px] pb-[13px]">
                <LcarsSkeleton className="h-[21px] w-[60%]" />
                <div className="mt-[10px] flex gap-[16px]">
                  <LcarsSkeleton className="h-[11px] w-[70px]" />
                  <LcarsSkeleton className="h-[11px] w-[110px]" />
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
