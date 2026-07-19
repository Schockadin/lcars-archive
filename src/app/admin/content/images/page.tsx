import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { getAllContentImagesForAdmin } from "@/lib/contentImages";
import ImagesAdminGrid from "./ImagesAdminGrid";

export const metadata: Metadata = {
  title: "Bilder",
  robots: { index: false, follow: false },
};

// Admin-only Übersicht über alle hochgeladenen Bilder (Charaktere/Missionen/
// Missionslogs/Archiv-Einträge, siehe content_images in scripts/schema.sql)
// im selben R2-Bucket wie die DB-Backups — Vorschau + Löschen unabhängig
// davon, wer der Owner des jeweiligen Inhalts ist (anders als die
// Bilder-Galerie auf den Detailseiten selbst, ContentImageGallery.tsx).
export default async function AdminImagesPage() {
  await requireAdmin();

  const images = await getAllContentImagesForAdmin();

  return (
    <>
      <PageMeta title="Bilder" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Bilder</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-text-dim text-[13px]">
            Alle Bilder, die für Charaktere, Missionen, Missionslogs und
            Archiv-Einträge hochgeladen wurden (nicht Gespräche). Bilder ohne
            erkennbaren Inhalt gehören zu bereits gelöschten Einträgen.
          </p>
          <Link
            href="/admin/content"
            className="lcars-pill-btn--outline self-start max-sm:w-full max-sm:self-stretch"
          >
            Zur Inhaltsübersicht
          </Link>
          <ImagesAdminGrid images={images} />
        </div>
      </article>
    </>
  );
}
