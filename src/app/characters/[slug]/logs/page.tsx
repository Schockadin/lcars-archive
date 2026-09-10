// src/app/characters/[slug]/logs/page.tsx
import { getCharacterBySlug } from "@/lib/characters";
import { notFound, redirect } from "next/navigation";
import { getViewer, canView } from "@/lib/visibility";
import { characterLogsHref } from "@/lib/contentRoutes";

interface Props {
  params: Promise<{ slug: string }>;
}

// Alte, gespeicherte Logbuch-Links bleiben gültig, führen aber zur gefilterten
// Chronologie. Sichtbarkeit wird vor dem Redirect wie auf der früheren Seite
// geprüft, damit ein privater Charaktername nicht über die URL preisgegeben
// wird.
export default async function CharacterLogsPage({ params }: Props) {
  const { slug } = await params;
  const [character, viewer] = await Promise.all([
    getCharacterBySlug(slug),
    getViewer(),
  ]);
  if (!character) notFound();

  if (
    character.visibility !== "public" &&
    !canView(character.visibility, character.player_id, viewer)
  ) {
    notFound();
  }

  redirect(characterLogsHref(character.name));
}