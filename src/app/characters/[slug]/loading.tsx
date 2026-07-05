import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Personalakte. Übernimmt das echte char-file-Grid
// (Schiene | Portrait+Daten | Biografie), füllt es aber mit Platzhaltern.
export default function Loading() {
  return (
    <div className="h-full">
      <div className="mb-[12px] mr-[var(--lcars-elbow-size)]">
        <section className="char-file">
          <header className="char-file-head">
            <LcarsSkeleton className="h-[34px] w-[280px]" />
            <div className="char-file-pills">
              {Array.from({ length: 4 }).map((_, i) => (
                <LcarsSkeleton
                  key={i}
                  className="h-[30px] w-[96px] rounded-[100vmax]"
                />
              ))}
            </div>
          </header>

          <LcarsSkeleton className="h-[16px] w-full" />

          <div className="char-file-grid">
            <aside className="char-file-rail" aria-hidden="true" />

            <div className="char-file-colmid">
              <LcarsSkeleton
                className="w-full"
                style={{ aspectRatio: "3 / 4" }}
              />
              <div className="char-file-data mt-3 flex flex-col gap-[8px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LcarsSkeleton key={i} className="h-[16px] w-full" />
                ))}
              </div>
              <LcarsSkeleton className="mt-3 h-[22px] w-[120px]" />
            </div>

            <div className="char-file-colend">
              <LcarsSkeleton className="mb-[12px] h-[44px] w-[70%]" />
              <LcarsSkeleton className="mb-[20px] h-[16px] w-[40%]" />
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
          </div>
        </section>
      </div>
    </div>
  );
}
