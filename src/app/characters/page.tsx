// src/app/charaktere/page.tsx
import { getAllCharacters } from '@/lib/characters';
import { Character } from '@/types/character';

export const dynamic = 'force-dynamic';

export default async function CharakterePage() {
  const characters = await getAllCharacters();

  const active   = characters.filter(c => c.status === 'active');
  const retired  = characters.filter(c => c.status === 'retired');
  const deceased = characters.filter(c => c.status === 'deceased');

  return (
    <main>
      <h1>Charaktere</h1>

      {active.length > 0 && (
        <section>
          <h2>Aktiv</h2>
          <CharacterGrid characters={active} />
        </section>
      )}

      {retired.length > 0 && (
        <section>
          <h2>Ehemalig</h2>
          <CharacterGrid characters={retired} />
        </section>
      )}

      {deceased.length > 0 && (
        <section>
          <h2>Verstorben</h2>
          <CharacterGrid characters={deceased} />
        </section>
      )}
    </main>
  );
}

function CharacterGrid({ characters }: { characters: Character[] }) {
  return (
    <ul>
      {characters.map(c => (
        <li key={c.slug}>
          <a href={`/charaktere/${c.slug}`}>
            {c.portrait && (
              <img src={c.portrait} alt={c.name} />
            )}
            <span>{c.name}</span>
            {c.metadata.rank && (
              <span>{c.metadata.rank}</span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}