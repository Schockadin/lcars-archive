import Link from "next/link";
import { getLogsByCharacter } from "@/lib/characters";
import type { Character } from "@/types/character";
import { fmtDate, sessionLabel } from "@/lib/missionFormat";

// "Deine Charaktere" — reuses the character-entry-* classes from
// src/app/characters/CharacterPage.tsx for visual consistency, plus die
// jeweiligen Mission-Logs (getLogsByCharacter existiert bereits).
export default function DashboardCharacters({
  characters,
  heading = "Deine Charaktere",
}: {
  characters: Character[];
  heading?: string;
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <p className="lcars-eyebrow">{heading}</p>

      {characters.length === 0 ? (
        <p className="char-file-bio-empty">Noch kein Charakter zugeordnet.</p>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {characters.map((c) => (
            <CharacterBlock key={c.id} character={c} />
          ))}
        </div>
      )}
    </section>
  );
}

async function CharacterBlock({ character }: { character: Character }) {
  const logs = await getLogsByCharacter(character.id);

  return (
    <div className="flex flex-col gap-[6px]">
      <Link
        href={`/characters/${character.slug}`}
        className="character-entry"
        style={{ "--entry-color": "var(--lcars-blue)" } as React.CSSProperties}
      >
        <span className="character-entry-stub">
          {String(character.id).padStart(3, "0")}
        </span>
        <span className="character-entry-bar">
          <span className="character-entry-name">{character.name}</span>
          {character.metadata.rank && (
            <span className="character-entry-rank">
              {character.metadata.rank}
            </span>
          )}
        </span>
      </Link>

      {logs.length > 0 && (
        <ul className="ml-[24px] flex flex-col gap-[2px]">
          {logs.slice(0, 5).map((log) => (
            <li key={log.id}>
              <Link
                href={`/missions/${log.mission_slug}/${log.slug}`}
                className="text-lcars-text-data hover:underline"
              >
                {sessionLabel(log.session_nr)} · {log.title}
                {log.log_date ? ` · ${fmtDate(log.log_date)}` : ""}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
