import { notFound, redirect } from "next/navigation";
import { getArchiveEntryBySlug } from "@/lib/archive";
import { canView, getViewer } from "@/lib/visibility";
import { dialogueHref, archiveHref } from "@/lib/contentRoutes";

interface Props {
  params: Promise<{ slug: string }>;
}

// Alte Gesprächs-URLs bleiben gültig und führen zur kanonischen Archivseite.
export default async function CharacterDialoguePage({ params }: Props) {
  const { slug } = await params;
  const [entry, viewer] = await Promise.all([
    getArchiveEntryBySlug(slug),
    getViewer(),
  ]);
  if (!entry || entry.category !== "dialogue") notFound();

  // Offenes Gespräch → Spielansicht. Der Teilnehmer-Gate dort ist die richtige
  // Zugriffsprüfung (jeder Teilnehmer, nicht nur der Ersteller).
  if (entry.dialogue_open) redirect(dialogueHref(entry.slug));
  if (!canView(entry.isDraft, entry.ownerUserId, viewer)) notFound();
  redirect(archiveHref(entry.slug));
}
