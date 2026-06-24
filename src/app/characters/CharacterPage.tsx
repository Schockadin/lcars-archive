"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import Link from "next/link";
export interface CharacterDataRowProps {
  characters: Character[];
}

export default function CharacterPage({
  characters,
}: {
  characters: Character[];
}) {
  usePageMeta("Charaktere", "characters");

  const active = characters.filter((c) => c.status === "active");
  const retired = characters.filter((c) => c.status === "retired");
  const deceased = characters.filter((c) => c.status === "deceased");
  return (
    <div className="flex flex-col items-start pr-[var(--lcars-elbow-size)]">
      <h1 className="mb-[5px] text-[var(--lcars-amber)]">Charaktere</h1>
      <div className="flex flex-col gap-[32px]">
        {active.length > 0 && (
          <section className="mb-[5px]">
            <h2
              style={{
                textDecoration: "underline",
              }}
            >
              AKTIV
            </h2>
            <CharacterGrid characters={active} />
          </section>
        )}

        {retired.length > 0 && (
          <section className="mb-[5px]">
            <h2 style={{ textDecoration: "underline" }}>EHEMALIG</h2>
            <CharacterGrid characters={retired} />
          </section>
        )}

        {deceased.length > 0 && (
          <section className="mb-[5px]">
            <h2 style={{ textDecoration: "underline" }}>VERSTORBEN</h2>
            <CharacterGrid characters={deceased} />
          </section>
        )}
      </div>
    </div>
  );
}

function CharacterGrid({ characters }: CharacterDataRowProps) {
  return (
    <div className="flex flex-col gap-[10px] mt-[10px]">
      {characters.map((c) => (
        <Link
          className="character-list-entry"
          key={c.id}
          href={`/characters/${c.slug}`}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
