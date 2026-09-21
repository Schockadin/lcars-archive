import Link from "next/link";
import { LcarsAkteCard, LcarsDataRow } from "@/components/lcars";
import { PencilIcon } from "@/lib/icons";
import { CHARACTER_STATUS_LABEL } from "@/lib/characterFormat";
import { characterEditHref, characterHref } from "@/lib/contentRoutes";
import type { Character } from "@/types/character";

// Nur die Felder, die die Sektion zeigt — der volle Character-Datensatz trägt
// die gerenderte Biografie, source_md und den Werte-Teilbaum und hätte sie
// ungenutzt mitgeschickt (gleiche Überlegung wie OwnCharacterItem in
// /user/characters).
export interface DashboardCharacterItem {
  id: number;
  slug: string;
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
    slug: character.slug,
    name: character.name,
    rank: character.metadata.rank ?? null,
    status: character.status,
    isDraft: character.is_draft,
  };
}

// Die eigenen Charaktere auf dem Dashboard — jeder mit einem Knopf, der
// direkt in seine Kopfdaten führt. Gedacht für den häufigsten Weg überhaupt:
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
    <LcarsDataRow value={characters.length} label="Meine Charaktere">
      <div className="flex flex-col gap-[6px]">
        {characters.map((character) => (
          <div
            key={character.id}
            className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
          >
            <LcarsAkteCard
              href={characterHref(character.slug)}
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
            {/* Ein Icon statt „Bearbeiten": Bei mehreren Charakteren stünde
                dasselbe Wort mehrfach untereinander. Die Beschriftung lebt im
                aria-label und im Tooltip — wie beim Hilfe-Knopf. */}
            <Link
              href={characterEditHref(character.id)}
              className="lcars-icon-btn shrink-0 max-sm:self-end"
              aria-label={`${character.name} bearbeiten`}
              title={`${character.name} bearbeiten`}
            >
              <PencilIcon />
            </Link>
          </div>
        ))}
      </div>
    </LcarsDataRow>
  );
}
