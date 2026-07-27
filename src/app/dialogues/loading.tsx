import PageSkeleton from "@/app/_shared/PageSkeleton";

// Route-Skelett während des Server-Roundtrips (siehe PageSkeleton).
export default function Loading() {
  return <PageSkeleton rows={4} />;
}
