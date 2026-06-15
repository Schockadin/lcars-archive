// src/app/charaktere/[slug]/page.tsx
import { getCharacterBySlug, getAllCharacters } from '@/lib/characters';
import { notFound } from 'next/navigation';

// Statische Routen zur Build-Zeit generieren
export async function generateStaticParams() {
  const characters = await getAllCharacters();
  return characters.map(c => ({ slug: c.slug }));
}

interface Props {
  params: { slug: string };
}

export default async function CharakterPage({ params }: Props) {
  const character = await getCharacterBySlug(params.slug);

  if (!character) notFound();

  return (
    <article>
      <header>
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
      </header>

      {character.bio && (
        <section
          dangerouslySetInnerHTML={{ __html: character.bio }}
        />
      )}
    </article>
  );
}