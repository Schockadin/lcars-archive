import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback eines einzelnen Logs (rechte Spalte). Greift beim
// Wechsel zwischen Logs derselben Mission – die Liste links bleibt stehen.
export default function Loading() {
  return (
    <article className="mission-detail-article">
      <header className="mission-detail-header">
        <div className="flex flex-wrap gap-[16px]">
          <LcarsSkeleton className="h-[14px] w-[90px]" />
          <LcarsSkeleton className="h-[14px] w-[110px]" />
          <LcarsSkeleton className="h-[14px] w-[140px]" />
        </div>
        <LcarsSkeleton className="mt-[10px] h-[40px] w-[60%]" />
      </header>

      <div className="mt-[16px] flex flex-col gap-[10px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <LcarsSkeleton
            key={i}
            className="h-[14px]"
            style={{ width: `${95 - (i % 5) * 8}%` }}
          />
        ))}
      </div>
    </article>
  );
}
