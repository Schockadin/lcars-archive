import type { Metadata } from "next";
import CategoryTimeline, {
  ChronologyShell,
} from "@/app/chronologie/_shared/CategoryChronology";
import {
  isTimelineCategory,
  isTimelineScope,
  type TimelineScope,
} from "@/lib/timelineTypes";

export const metadata: Metadata = {
  title: "Chronologie",
};

interface Props {
  searchParams: Promise<{ scope?: string; category?: string; person?: string }>;
}

// Filter in der Adresse sind teilbar. Die frühere Charakter-Logbuchseite
// nutzt das für „Logbücher → Charakter".
export default function ChronologiePage({ searchParams }: Props) {
  return (
    <ChronologyShell>
      <ChronologieContent searchParams={searchParams} />
    </ChronologyShell>
  );
}

// searchParams wird hier drin aufgelöst, nicht in der Seite selbst: unter
// cacheComponents ist es ein Laufzeit-Zugriff und würde außerhalb der
// Suspense-Grenze die ganze Seite blockieren.
async function ChronologieContent({ searchParams }: Props) {
  const { scope, category, person } = await searchParams;
  const initialScope: TimelineScope | undefined =
    scope && isTimelineScope(scope) ? scope : undefined;
  const initialCategory =
    category && isTimelineCategory(category) ? category : null;
  const initialPerson = person?.trim() || null;

  return (
    <CategoryTimeline
      help
      category={initialCategory}
      initialScope={initialScope}
      initialPerson={initialPerson}
    />
  );
}
