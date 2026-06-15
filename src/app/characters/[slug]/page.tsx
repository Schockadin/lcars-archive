import { getCharacterBySlug } from '@/lib/characters';
import { notFound } from 'next/navigation';

// Verhindert statisches Prerendering – Seite wird zur Laufzeit gerendert
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CharakterPage({ params }: Props) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);

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