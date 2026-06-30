import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Archiv-Übersicht.
export default function Loading() {
  return (
    <div className="flex flex-col items-start w-[var(--lcars-charpage-w)]">
      <div className="mb-[16px] w-full">
        <LcarsSkeleton className="mb-[6px] h-[34px] w-[140px]" />
        <LcarsSkeleton className="h-[16px] w-[60%]" />
      </div>

      {Array.from({ length: 3 }).map((_, g) => (
        <section key={g} className="mb-[20px] w-full">
          <LcarsSkeleton className="ml-[12px] h-[40px] w-[300px]" />
          <div className="mt-[8px] flex flex-col gap-[3px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <LcarsSkeleton key={i} className="h-[34px] w-full" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
