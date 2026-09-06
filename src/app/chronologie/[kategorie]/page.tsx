import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import CategoryTimeline, {
  categoryMetadata,
} from "@/app/chronologie/_shared/CategoryChronology";
import { isTimelineCategory } from "@/lib/timelineTypes";

interface Props {
  params: Promise<{ kategorie: string }>;
}

// /chronologie/[kategorie] — die Chronologie auf eine Ereignisart
// eingeschränkt. „mission" landet nie hier: das gleichnamige statische
// Segment (src/app/chronologie/mission/page.tsx) hat Vorrang und ist zugleich
// das Präfix der Missionsseiten.
//
// Ein unbekanntes Segment ist eine 404 statt einer leeren Liste — sonst sähe
// jeder Tippfehler wie eine Kampagne ohne Ereignisse aus.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategorie } = await params;
  if (!isTimelineCategory(kategorie)) return { title: "Nicht gefunden" };
  return categoryMetadata(kategorie);
}

export default function ChronologieKategoriePage({ params }: Props) {
  return (
    <>
      <PageMeta title="Chronologie" section="chronologie" />
      <Suspense fallback={<PageSkeleton />}>
        <KategorieContent params={params} />
      </Suspense>
    </>
  );
}

// params wird hier drin aufgelöst, nicht in der Seite selbst: unter
// cacheComponents ist es ein Laufzeit-Zugriff und würde außerhalb der
// Suspense-Grenze die ganze Seite blockieren.
async function KategorieContent({ params }: Props) {
  const { kategorie } = await params;
  if (!isTimelineCategory(kategorie)) notFound();
  return <CategoryTimeline category={kategorie} />;
}
