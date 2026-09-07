import type { Metadata } from "next";
import CategoryTimeline, {
  ChronologyShell,
  categoryMetadata,
} from "@/app/chronologie/_shared/CategoryChronology";

// /chronologie/mission — dieselbe Kategorie-Seite wie /chronologie/[kategorie],
// nur eigens ausgeschrieben: unter diesem Segment liegen auch die
// Missionsseiten (/chronologie/mission/[missionSlug]), und ein statisches
// Segment schlägt in Next das gleichnamige dynamische. Ohne diese Datei wäre
// /chronologie/mission eine 404.
export const metadata: Metadata = categoryMetadata("mission");

export default function ChronologieMissionenPage() {
  return (
    <ChronologyShell>
      <CategoryTimeline category="mission" />
    </ChronologyShell>
  );
}
