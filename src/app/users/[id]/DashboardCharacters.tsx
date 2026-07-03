import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { Character } from "@/types/character";

// "Deine Charaktere" — reuses the character-entry-* classes from
// src/app/characters/CharacterPage.tsx for visual consistency. Zeigt nur
// noch den Namen (Details stehen im Charakter-Eintrag selbst).
export default function DashboardCharacters({
  characters,
  heading = "Deine Charaktere",
}: {
  characters: Character[];
  heading?: string;
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <LcarsDataRow
        value={characters.length}
        label={heading}
        color="var(--lcars-blue)"
        className="lcars-data-row--full"
      />

      {characters.length === 0 ? (
        <p className="char-file-bio-empty">Noch kein Charakter zugeordnet.</p>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {characters.map((c) => (
            <Link
              key={c.id}
              href={`/characters/${c.slug}`}
              className="character-entry"
              style={{ "--entry-color": "var(--lcars-blue)" } as React.CSSProperties}
            >
              <span className="character-entry-stub">
                {String(c.id).padStart(3, "0")}
              </span>
              <span className="character-entry-bar">
                <span className="character-entry-name">{c.name}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
