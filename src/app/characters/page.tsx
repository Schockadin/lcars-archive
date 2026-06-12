// src/app/characters/page.tsx
import { getAllDocuments } from '@/lib/markdown';
import { CharacterFrontmatter } from '@/types/content';
import { DatapadLayout, MAIN_NAV } from '@/components/lcars';
import CharacterCard from '@/components/lcars/CharacterCard';
import { MarkdownDocument } from '@/types/content';

export const metadata = {
  title: 'Charaktere | LCARS Archiv',
};

export default function CharactersPage() {
  // Lade alle Charaktere aus dem Vault
  const characters = getAllDocuments<CharacterFrontmatter>('characters');

  // Sortiere: aktive zuerst, dann alphabetisch
  const sorted = [...characters].sort((a, b) => {
    if (a.frontmatter.status !== b.frontmatter.status) {
      const statusOrder = { active: 0, retired: 1, dead: 2 };
      return (
        (statusOrder[a.frontmatter.status as keyof typeof statusOrder] ?? 99) -
        (statusOrder[b.frontmatter.status as keyof typeof statusOrder] ?? 99)
      );
    }
    return a.frontmatter.name.localeCompare(b.frontmatter.name);
  });

  const nav = MAIN_NAV.map(item =>
    item.href === '/characters' ? { ...item, active: true } : item
  );

  // Statistiken für Header
  const activeCount = characters.filter(c => c.frontmatter.status === 'active').length;
  const totalCount = characters.length;

  return (
    <DatapadLayout
      title="Charakterregister"
      nav={nav}
      statusLeft={`${activeCount} AKTIV / ${totalCount} GESAMT`}
      statusRight="CHRONOLOGISCH SORTIERT"
      sidebarAccent="var(--lcars-purple)"
    >
      {/* Header-Statistiken */}
      <div className="grid grid-cols-3 gap-3 mb-6 max-w-2xl">
        <div className="lcars-card">
          <p className="lcars-label mb-1">Aktive</p>
          <p className="text-2xl font-bold text-lcars-text">{activeCount}</p>
        </div>
        <div className="lcars-card lcars-card-blue">
          <p className="lcars-label mb-1">Insgesamt</p>
          <p className="text-2xl font-bold text-lcars-text">{totalCount}</p>
        </div>
        <div className="lcars-card lcars-card-amber">
          <p className="lcars-label mb-1">Inaktiv</p>
          <p className="text-2xl font-bold text-lcars-text">
            {totalCount - activeCount}
          </p>
        </div>
      </div>

      {/* Charaktere-Gitter */}
      <div className="space-y-2">
        <p className="lcars-label mb-3">REGISTER</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
          {sorted.map(char => (
            <CharacterCard
              key={char.slug}
              character={char.frontmatter}
              slug={char.slug}
            />
          ))}
        </div>
      </div>
    </DatapadLayout>
  );
}