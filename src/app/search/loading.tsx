import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback der Suchseite (Toolbar + Ergebnisliste).
export default function Loading() {
  return (
    <div className="w-full max-w-[640px]">
      <LcarsSkeleton className="mb-[16px] h-[34px] w-[220px]" />
      <div className="mission-toolbar">
        <LcarsSkeleton className="h-[30px] w-[380px]" />
      </div>
      <div className="archive-entry-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <LcarsSkeleton key={i} className="h-[92px] w-full" />
        ))}
      </div>
    </div>
  );
}
