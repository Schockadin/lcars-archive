import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Missionsseite: Kopf und Text der Synopsis. Die
// Logbuch-Übersicht darunter kommt mit der Seite und braucht kein eigenes
// Gerüst (bis zum Redesign lag sie als Schiene im Layout daneben).
export default function Loading() {
  return (
    <article className="mission-detail-article">
      {/* Form folgt ContentDetailHeader: Titel, darunter die beschrifteten
          Metazeilen (Status, Zeitraum, Teilnehmer). */}
      <header className="archive-entry-head">
        <LcarsSkeleton className="h-[40px] w-[55%]" />
        <div className="archive-dialogue-meta">
          {[120, 170, 220].map((width) => (
            <div key={width} className="archive-dialogue-row">
              <LcarsSkeleton className="h-[14px] w-[92px]" />
              <LcarsSkeleton className="h-[26px]" style={{ width }} />
            </div>
          ))}
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
