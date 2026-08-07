import { LcarsSkeleton } from "@/components/lcars";

export default function Loading() {
  return (
    <div className="pr-[var(--lcars-elbow-size)]">
      <div className="mb-[12px] flex flex-col gap-[8px]">
        <LcarsSkeleton className="h-[40px] w-[260px]" />
        <LcarsSkeleton className="h-[14px] w-[320px]" />
      </div>
      <div className="flex flex-col gap-[12px]">
        <div className="flex gap-[8px]">
          <LcarsSkeleton className="h-[32px] w-[80px] rounded-full" />
          <LcarsSkeleton className="h-[32px] w-[100px] rounded-full" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <LcarsSkeleton key={i} className="h-[80px] w-full rounded-[8px]" />
        ))}
      </div>
    </div>
  );
}
