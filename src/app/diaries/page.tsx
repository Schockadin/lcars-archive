// src/app/diaries/page.tsx
import { getAllDocuments } from '@/lib/markdown';
import { DiaryFrontmatter } from '@/types/content';
import { DatapadLayout, MAIN_NAV } from '@/components/lcars';
import DiaryCard from '@/components/lcars/DiaryCard';

export const metadata = {
  title: 'Tagebücher | LCARS Archiv',
};

export default function DiariesPage() {
  // Lade alle Tagebücher
  const diaries = getAllDocuments<DiaryFrontmatter>('diaries');

  // Sortiere nach Datum (neueste zuerst)
  const sorted = [...diaries].sort((a, b) => {
    return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
  });

  const nav = MAIN_NAV.map(item =>
    item.href === '/diaries' ? { ...item, active: true } : { ...item, href: item.href === '/sessions' ? '/diaries' : item.href }
  );

  // Statistiken
  const totalEntries = diaries.length;
  const authorsSet = new Set(diaries.map(d => d.frontmatter.author).filter(Boolean));
  const charactersSet = new Set(
    diaries.flatMap(d => d.frontmatter.characters || [])
  );

  return (
    <DatapadLayout
      title="Tagebucheinträge"
      nav={nav}
      statusLeft={`${totalEntries} EINTRÄGE // ${authorsSet.size} AUTOREN`}
      statusRight="CHRONOLOGISCH SORTIERT"
      sidebarAccent="var(--lcars-amber)"
    >
      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 max-w-3xl">
        <div className="lcars-card lcars-card-amber">
          <p className="lcars-label mb-1">Einträge</p>
          <p className="text-2xl font-bold text-lcars-text">{totalEntries}</p>
        </div>
        <div className="lcars-card lcars-card-blue">
          <p className="lcars-label mb-1">Autoren</p>
          <p className="text-2xl font-bold text-lcars-text">{authorsSet.size}</p>
        </div>
        <div className="lcars-card">
          <p className="lcars-label mb-1">Charaktere</p>
          <p className="text-2xl font-bold text-lcars-text">{charactersSet.size}</p>
        </div>
        <div className="lcars-card">
          <p className="lcars-label mb-1">Zeitspanne</p>
          <p className="text-xs font-bold text-lcars-text">
            {new Date(sorted[sorted.length - 1]?.frontmatter.date).getFullYear()} -
            {new Date(sorted[0]?.frontmatter.date).getFullYear()}
          </p>
        </div>
      </div>

      {/* Einträge-Liste */}
      <div className="space-y-2">
        <p className="lcars-label mb-4">EINTRAG</p>
        <div className="space-y-2 max-w-4xl">
          {sorted.map(diary => (
            <DiaryCard
              key={diary.slug}
              diary={diary.frontmatter}
              slug={diary.slug}
              number={diary.frontmatter.number}
            />
          ))}
        </div>
      </div>
    </DatapadLayout>
  );
}