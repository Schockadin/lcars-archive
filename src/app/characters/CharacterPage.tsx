
'use client'
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";
import Link from "next/link";

export default function CharacterPage({ characters}: { characters : Character[]}) {
  usePageMeta("Charaktere","characters");

  const active   = characters.filter(c => c.status === 'active');
  const retired  = characters.filter(c => c.status === 'retired');
  const deceased = characters.filter(c => c.status === 'deceased');
  return (
    <main>
      <h1 className="mb-[5px]">Charaktere</h1>

      {active.length > 0 && (
        <section className="mb-[5px]">
          <h2>Aktiv</h2>
          <CharacterGrid characters={active} />
        </section>
      )}

      {retired.length > 0 && (
        <section className="mb-[5px]">
          <h2>Ehemalig</h2>
          <CharacterGrid characters={retired} />
        </section>
      )}

      {deceased.length > 0 && (
        <section className="mb-[5px]">
          <h2>Verstorben</h2>
          <CharacterGrid characters={deceased} />
        </section>
      )}
    </main>
  );
}

function CharacterGrid({ characters }: { characters: Character[] }) {
  return (
    <>
      {characters.map(c => (
        <Link className="character-list-entry" key={c.id} href={`/characters/${c.slug}`}>· {c.metadata.rank} {c.name}</Link>
      ))}
    </>
  );
}