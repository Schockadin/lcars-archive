'use client'
import { usePageMeta } from "@/hooks/usePageMeta";
import { Character } from "@/types/character";

export default function CharakterDetailPage({character}: {character : Character}) {
  const title = `${character.name}\r\n${character.metadata.rank} - ${character.metadata.species}`
  usePageMeta(character.name,"characters");

  return (
    <article className="text-justify">
      {/* <div className="mb-[16px]">
        {character.portrait && (
          <img src={character.portrait} alt={character.name} />
        )}
        <h1>{character.name}</h1>
        {character.metadata.rank && <p>{character.metadata.rank}</p>}
        {character.metadata.species.length > 0 && (
          <p>{character.metadata.species.join(' / ')}</p>
        )}
        {character.metadata.affiliation && (
          <p>{character.metadata.affiliation.factions.join(', ')}</p>
        )}
      </div> */}

      {character.bio && (
        <section
          dangerouslySetInnerHTML={{ __html: character.bio }}
        />
      )}
    </article>
  );
}