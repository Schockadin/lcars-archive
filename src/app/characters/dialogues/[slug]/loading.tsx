import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der abgeschlossenen Gesprächsseite — passt zum Inhalt
// (Kopf mit Teilnehmern/Ort/Datum + Gesprächsverlauf als Nachrichten-Zeilen),
// nicht der generische Charakter-Listen-Loader des Elternsegments. Entspricht
// dem Loader der offenen Gesprächsseite (/dialogues/[slug]).
export default function Loading() {
  return (
    <article className="archive-entry pb-[5px]">
      <LcarsSkeleton className="mb-[12px] h-[44px] w-[55%]" />
      <div className="mb-[20px] flex flex-wrap gap-[12px]">
        <LcarsSkeleton className="h-[18px] w-[160px]" />
        <LcarsSkeleton className="h-[18px] w-[110px]" />
        <LcarsSkeleton className="h-[18px] w-[90px]" />
      </div>

      <div className="flex flex-col gap-[14px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[6px]">
            <LcarsSkeleton className="h-[16px] w-[130px]" />
            <LcarsSkeleton
              className="h-[14px]"
              style={{ width: `${90 - (i % 3) * 14}%` }}
            />
            <LcarsSkeleton
              className="h-[14px]"
              style={{ width: `${70 - (i % 2) * 12}%` }}
            />
          </div>
        ))}
      </div>
    </article>
  );
}
