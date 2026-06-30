import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der rechten Spalte (Eintrags-Liste).
export default function Loading() {
  return (
    <div>
      <LcarsSkeleton className="mb-[16px] h-[34px] w-[180px]" />
      <div className="archive-entry-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <LcarsSkeleton key={i} className="h-[92px] w-full" />
        ))}
      </div>
    </div>
  );
}
