// src/components/lcars/DiaryCard.tsx
import Link from 'next/link';
import { DiaryFrontmatter } from '@/types/content';

interface DiaryCardProps {
  diary: DiaryFrontmatter;
  slug: string;
  number?: number;
}

export default function DiaryCard({ diary, slug, number }: DiaryCardProps) {
  const date = new Date(diary.date);
  const formattedDate = date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={`/diaries/${slug}`}>
      <div className="lcars-card lcars-card-amber hover:bg-lcars-surface-2 transition cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <p className="lcars-label">
            {number ? `EINTRAG #${String(number).padStart(3, '0')}` : 'EINTRAG'}
          </p>
          <p className="lcars-data text-xs">{formattedDate}</p>
        </div>

        <h3 className="text-lcars-text font-bold mb-2">
          {diary.title}
        </h3>

        {diary.summary && (
          <p className="text-sm text-lcars-text-dim mb-2">
            {diary.summary}
          </p>
        )}

        <div className="flex flex-wrap gap-2 items-center justify-between">
          {diary.author && (
            <span className="lcars-label text-xs">
              Von: {diary.author}
            </span>
          )}
          {diary.location && (
            <span className="lcars-data text-xs">
              📍 {diary.location}
            </span>
          )}
        </div>

        {diary.characters && diary.characters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {diary.characters.map(char => (
              <span
                key={char}
                className="lcars-pill lcars-pill-dim text-xs"
              >
                {char}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}