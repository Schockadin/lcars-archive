import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnCharacterStats } from "@/lib/characters";
import CharacterStatsForm from "./CharacterStatsForm";

export const metadata: Metadata = {
  title: "Charakterwerte",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ characterId: string }>;
}

// Charakterwerte eines eigenen Charakters ansehen/bearbeiten. Die
// Berechtigung steckt in der Query selbst (getOwnCharacterStats ist
// owner-gescoped) — wie bei [characterId]/edit führt ein fremder oder
// unbekannter Charakter zurück auf die Übersicht statt einen Fehler zu zeigen
// (verrät so auch nicht, ob es die id überhaupt gibt).
export default async function CharacterStatsPage({ params }: Props) {
  const { characterId } = await params;
  const session = await verifySession();

  const id = Number(characterId);
  if (!Number.isInteger(id)) redirect("/user/characters");

  const character = await getOwnCharacterStats(session.userId, id);
  if (!character) redirect("/user/characters");

  return (
    <>
      <PageMeta title={character.name} section="users" />
      <h1>Werte: {character.name}</h1>
      <p className="lcars-text">
        Werte nach dem Charakterbogen. Name, Rang und Spezies gehören zur Akte
        selbst und werden über{" "}
        <Link href={`/user/characters/${character.id}/edit`}>
          Charakter bearbeiten
        </Link>{" "}
        gepflegt. Leere Felder gelten als „nicht angegeben&ldquo;.
      </p>

      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <CharacterStatsForm
          userId={session.userId}
          characterId={character.id}
          stats={character.stats}
        />
      </article>
    </>
  );
}
