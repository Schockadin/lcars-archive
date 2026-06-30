import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Charakter-Log-Liste.
export default function Loading() {
  return (
    <div className="w-full max-w-[640px]">
      <div className="mission-loglist">
        <LcarsSkeleton className="mb-[10px] h-[26px] w-[200px]" />
        <LcarsSkeleton className="mb-[6px] h-[34px] w-[120px]" />
        <LcarsSkeleton className="mb-[16px] h-[16px] w-[60%]" />

        <div className="flex gap-[10px] mb-[12px]">
          <LcarsSkeleton className="h-[30px] flex-1" />
          <LcarsSkeleton className="h-[30px] flex-1" />
        </div>

        <div className="flex flex-col gap-[3px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <LcarsSkeleton key={i} className="h-[44px] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
