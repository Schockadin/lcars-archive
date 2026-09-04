import { LcarsSkeleton } from "@/components/lcars";

// Generisches LCARS-Seiten-Skelett für die dynamischen Bereiche (/user, /admin,
// /dialogues, /login), die — anders als die statisch gerenderten
// Inhaltsseiten — kein eigenes, spezifisches loading.tsx hatten. Zeigt während
// des Server-Roundtrips Eyebrow + Titel + ein paar Platzhalter-Zeilen, damit
// die Navigation nicht „leer" wirkt.
export default function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <article className="mb-[10px] lcars-wide-column">
      <div className="flex flex-col gap-[12px]">
        <LcarsSkeleton className="h-[16px] w-[160px]" />
        <LcarsSkeleton className="h-[40px] w-[280px]" />
      </div>
      <div className="mt-[24px] flex flex-col gap-[10px]">
        {Array.from({ length: rows }).map((_, i) => (
          <LcarsSkeleton
            key={i}
            className="h-[34px] w-[100%] rounded-[var(--lcars-radius-pill)]"
          />
        ))}
      </div>
    </article>
  );
}
