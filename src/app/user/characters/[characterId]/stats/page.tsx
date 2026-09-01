import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { verifySession } from "@/lib/dal";
import { getOwnCharacterStats } from "@/lib/characters";
import { getApAccount } from "@/lib/characterAp";
import { getAdvancementRules } from "@/lib/advancementSettings";
import { listTalents } from "@/lib/talents";
import CharacterSheet from "./CharacterSheet";

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

  // AP-Konto erst NACH dem Owner-Check laden — vorher ist nicht klar, ob der
  // Charakter überhaupt zum Konto gehört.
  const account = await getApAccount(character.id);
  // Das geltende Regelwerk (Kosten, Erschaffungsbudgets) — von der
  // Spielleitung unter /gm/ap einstellbar.
  const rules = await getAdvancementRules();
  // Talent-Katalog für die Auswahlliste (Steigern und Erschaffung).
  const talents = await listTalents();

  return (
    <>
      <PageMeta title={character.name} section="users" />
      <h1>Werte: {character.name}</h1>
      <p className="lcars-text">
        Der Original-Charakterbogen zum Ausfüllen. Name, Rang und Spezies
        stehen darauf, gehören aber zur Akte und werden über{" "}
        <Link href={`/user/characters/${character.id}/edit`}>
          Charakter bearbeiten
        </Link>{" "}
        gepflegt. Leere Felder gelten als „nicht angegeben&ldquo;. Der maximale
        Stress ergibt sich aus Fitness und dem Bonus aus Talenten und ist
        deshalb kein Eingabefeld; die Stress-Kästchen zeigen nur, wie viele der
        Charakter hat — abgestrichen wird am Spieltisch. Bild, Stress-Bonus und
        Speichern stehen unter dem Bogen, dafür hat das Papier keine Felder.
      </p>

      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <CharacterSheet
          userId={session.userId}
          characterId={character.id}
          characterName={character.name}
          rank={character.rank}
          portrait={character.portrait}
          species={character.species}
          stats={character.stats}
          account={account}
          rules={rules}
          talents={talents}
        />
      </article>
    </>
  );
}
