import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Archiv-Detailseite.
export default function Loading() {
  return (
    <div className="archive-entry">
      <LcarsSkeleton className="mb-[14px] h-[24px] w-[120px]" />
      <LcarsSkeleton className="mb-[10px] h-[22px] w-[90px] rounded-[100vmax]" />
      <LcarsSkeleton className="mb-[12px] h-[44px] w-[60%]" />

      <div className="flex gap-[8px] mb-[20px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <LcarsSkeleton key={i} className="h-[20px] w-[70px] rounded-[100vmax]" />
        ))}
      </div>

      <div className="flex flex-col gap-[10px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <LcarsSkeleton
            key={i}
            className="h-[14px]"
            style={{ width: `${92 - (i % 3) * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
