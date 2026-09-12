import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback eines einzelnen Logbuchs.
export default function Loading() {
  return (
    <article className="mission-detail-article">
      {/* Form folgt ContentDetailHeader: Titel zuerst, darunter die
          beschrifteten Metazeilen (Datum, Autor). */}
      <header className="archive-entry-head">
        <LcarsSkeleton className="h-[40px] w-[60%]" />
        <div className="archive-dialogue-meta">
          {[110, 180].map((width) => (
            <div key={width} className="archive-dialogue-row">
              <LcarsSkeleton className="h-[14px] w-[92px]" />
              <LcarsSkeleton className="h-[26px]" style={{ width }} />
            </div>
          ))}
        </div>
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
