import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { requirePermission } from "@/lib/dal";
import { getDialogueMetadataForEdit } from "@/lib/dialogues";
import { getAllArchiveEntries } from "@/lib/archive";
import EditDialogueMetadataForm from "./EditDialogueMetadataForm";

export const metadata: Metadata = {
  title: "Gespräch bearbeiten",
  robots: { index: false, follow: false },
};

// Admin-only (strenger als der übrige GM-Bereich) — Metadaten eines Gesprächs
// bearbeiten. Deckt offene wie abgeschlossene Gespräche ab.
export default async function EditDialoguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePermission("dialogues.moderate");
  const { slug } = await params;

  const [dialogue, archiveEntries] = await Promise.all([
    getDialogueMetadataForEdit(slug),
    getAllArchiveEntries(),
  ]);
  if (!dialogue) notFound();

  const locations = archiveEntries
    .filter((e) => e.category === "location")
    .map((l) => ({ slug: l.slug, title: l.title }));

  return (
    <>
      <PageMeta title="Gespräch bearbeiten" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Gespräch bearbeiten</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Bearbeitet nur die Metadaten dieses Gesprächs — der eigentliche
            Gesprächsverlauf bleibt unverändert.
          </p>

          <EditDialogueMetadataForm dialogue={dialogue} locations={locations} />

          <Link
            href="/gm/dialogues"
            className="text-lcars-primary underline self-start"
          >
            ← Zurück zur Gesprächsübersicht
          </Link>
        </div>
      </article>
    </>
  );
}
