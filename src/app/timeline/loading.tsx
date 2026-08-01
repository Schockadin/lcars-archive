import { LcarsSkeleton } from "@/components/lcars";

// Skeleton-Fallback des Story-Graphen (siehe StoryGraph.tsx): Kopf, Jahr-Regler
// und die Graph-Fläche.
export default function Loading() {
  return (
    <div className="pr-[var(--lcars-elbow-size)]">
      <div className="mb-[12px] flex flex-col gap-[8px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <LcarsSkeleton className="h-[14px] w-[320px]" />
      </div>
      <div className="story-graph">
        <div className="story-graph-controls">
          <LcarsSkeleton className="h-[14px] w-[60px]" />
          <LcarsSkeleton className="h-[20px] flex-1 rounded-full" />
          <LcarsSkeleton className="h-[32px] w-[80px] rounded-full" />
        </div>
        <div className="story-graph-body">
          <LcarsSkeleton className="story-graph-canvas rounded-[8px]" />
        </div>
      </div>
    </div>
  );
}
