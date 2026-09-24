import { LcarsAkteCard, LcarsCollapsiblePanel } from "@/components/lcars";
import { CHARACTER_STATUS_LABEL } from "@/lib/characterFormat";
import { characterEditHref } from "@/lib/contentRoutes";
import type { Character } from "@/types/character";

// Nur die Felder, die die Sektion zeigt — der volle Character-Datensatz trägt
// die gerenderte Biografie, source_md und den Werte-Teilbaum und hätte sie
// ungenutzt mitgeschickt (gleiche Überlegung wie OwnCharacterItem in
// /user/characters).
export interface DashboardCharacterItem {
  id: number;
  name: string;
  rank: string | null;
  status: Character["status"];
  isDraft: boolean;
}

export function toDashboardCharacterItem(
  character: Character,
): DashboardCharacterItem {
  return {
    id: character.id,
    name: character.name,
    rank: character.metadata.rank ?? null,
    status: character.status,
    isDraft: character.is_draft,
  };
}

// Die eigenen Charaktere auf dem Dashboard — jede Karte führt direkt in die
// eigene Akte. Gedacht für den häufigsten Weg überhaupt:
// „kurz was am eigenen Charakter ändern", der bisher über zwei Seiten ging.
//
// WELCHE Charaktere hier stehen, entscheidet das Profil (jeder einzeln,
// siehe dashboardSections.ts) — diese Komponente bekommt die bereits
// gefilterte Liste. Ganz ausgeblendet statt Leerzustand, wenn nichts übrig
// bleibt: das Dashboard soll keine leeren Kästen zeigen (wie
// FollowedContentSection).
export default function DashboardCharactersSection({
  characters,
}: {
  characters: DashboardCharacterItem[];
}) {
  if (characters.length === 0) return null;

  return (
    <LcarsCollapsiblePanel
      title="Meine Charaktere"
      badge={characters.length}
      storageId="dashboard:charaktere"
    >
      <div className="flex flex-col gap-[6px]">
        {characters.map((character) => (
          <div
            key={character.id}
            className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
          >
            <LcarsAkteCard
              href={characterEditHref(character.id)}
              color={
                character.isDraft
                  ? "var(--lcars-quinary)"
                  : "var(--lcars-primary)"
              }
              className="flex-1"
              title={character.name}
              meta={
                <>
                  <span>
                    <b>Status</b> {CHARACTER_STATUS_LABEL[character.status]}
                  </span>
                  {character.rank && (
                    <span>
                      <b>Rang</b> {character.rank}
                    </span>
                  )}
                  {character.isDraft && (
                    <span>
                      <b>Typ</b> Entwurf
                    </span>
                  )}
                </>
              }
            />
          </div>
        ))}
      </div>
    </LcarsCollapsiblePanel>
  );
}
