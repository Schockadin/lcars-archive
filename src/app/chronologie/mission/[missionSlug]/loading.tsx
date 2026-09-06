import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Mission-Synopsis (rechte Spalte). Die linke
// Log-Liste lebt im Layout und bleibt beim Navigieren erhalten.
export default function Loading() {
  return (
    <article className="mission-detail-article">
      <header className="mission-detail-header">
        <LcarsSkeleton className="h-[40px] w-[55%]" />
        <div className="mt-[10px] flex flex-wrap gap-[16px]">
          <LcarsSkeleton className="h-[20px] w-[90px]" />
          <LcarsSkeleton className="h-[14px] w-[160px]" />
          <LcarsSkeleton className="h-[14px] w-[120px]" />
        </div>
      </header>

      <LcarsSkeleton className="mt-[16px] h-[16px] w-full" />
      <LcarsSkeleton className="mt-[6px] h-[16px] w-[85%]" />

      <div className="mt-[20px] flex flex-col gap-[10px]">
        {Array.from({ length: 7 }).map((_, i) => (
          <LcarsSkeleton
            key={i}
            className="h-[14px]"
            style={{ width: `${94 - (i % 4) * 9}%` }}
          />
        ))}
      </div>
    </article>
  );
}
