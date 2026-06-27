import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Missions-Chronik: Jahres-Schiene + gestapelte Akten.
export default function Loading() {
  return (
    <div className="w-full max-w-[640px]">
      <div className="mb-[16px] flex flex-col gap-[8px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <LcarsSkeleton className="h-[14px] w-[320px]" />
      </div>

      <div className="mission-chronik">
        <div className="mission-rail" aria-hidden="true">
          <LcarsSkeleton accent className="h-[36px] rounded-tl-[14px]" />
          <LcarsSkeleton accent className="min-h-[80px] flex-1 rounded-none" />
          <LcarsSkeleton accent className="h-[36px] rounded-bl-[14px]" />
        </div>

        <div className="mission-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex w-full overflow-hidden rounded-[4px_14px_14px_4px]"
              style={{ background: "var(--lcars-surface)" }}
            >
              <LcarsSkeleton accent className="w-[9px] flex-shrink-0 rounded-none" />
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
          ))}
        </div>
      </div>
    </div>
  );
}
