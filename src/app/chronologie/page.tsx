import type { Metadata } from "next";
import CategoryTimeline, {
  ChronologyShell,
} from "@/app/chronologie/_shared/CategoryChronology";
import { isTimelineCategory, type TimelineScope } from "@/lib/timelineTypes";

export const metadata: Metadata = {
  title: "Chronologie",
};

// Filter in der Adresse sind teilbar. Die frühere Charakter-Logbuchseite
// nutzt das für „Alle Ereignisse → Logbücher → Charakter".
export default async function ChronologiePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; category?: string; person?: string }>;
}) {
  const { scope, category, person } = await searchParams;
  const initialScope: TimelineScope | undefined = scope === "all" ? "all" : undefined;
  const initialCategory = category && isTimelineCategory(category) ? category : null;
  const initialPerson = person?.trim() || null;

  return (
    <ChronologyShell>
      <CategoryTimeline
        category={initialCategory}
        initialScope={initialScope}
        initialPerson={initialPerson}
      />
    </ChronologyShell>
  );
}