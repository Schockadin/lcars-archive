// src/components/lcars/DiaryDetail.tsx
import { DiaryFrontmatter } from '@/types/content';

interface DiaryDetailProps {
  diary: DiaryFrontmatter;
  htmlContent: string;
}

export default function DiaryDetail({ diary, htmlContent }: DiaryDetailProps) {
  const date = new Date(diary.date);
  const formattedDate = date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl">
      {/* Tagebuch-Header */}
      <div className="mb-8 pb-6 border-b-2 border-lcars-border">
        <div className="mb-4">
          <p className="lcars-label mb-2">
            {diary.number && `EINTRAG #${String(diary.number).padStart(3, '0')}`}
          </p>
          <h1 className="lcars-heading text-3xl mb-3">{diary.title}</h1>
        </div>

        {/* Metadaten */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="lcars-card lcars-card-amber">
            <p className="lcars-label mb-1">DATUM</p>
            <p className="text-sm text-lcars-text font-bold">{formattedDate}</p>
          </div>

          {diary.author && (
            <div className="lcars-card lcars-card-blue">
              <p className="lcars-label mb-1">VERFASSER</p>
              <p className="text-sm text-lcars-text font-bold">{diary.author}</p>
            </div>
          )}

          {diary.location && (
            <div className="lcars-card">
              <p className="lcars-label mb-1">ORT</p>
              <p className="text-sm text-lcars-text font-bold">{diary.location}</p>
            </div>
          )}
        </div>

        {/* Zusammenfassung */}
        {diary.summary && (
          <div className="mt-4 p-4 bg-lcars-surface-2 border-l-3 border-lcars-amber rounded-r">
            <p className="lcars-data text-sm">{diary.summary}</p>
          </div>
        )}

        {/* Beteiligte Charaktere */}
        {diary.characters && diary.characters.length > 0 && (
          <div className="mt-4">
            <p className="lcars-label mb-2">BETEILIGTE</p>
            <div className="flex flex-wrap gap-2">
              {diary.characters.map(char => (
                <span
                  key={char}
                  className="lcars-pill lcars-pill-blue text-xs"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tagebuchtext */}
      <div className="lcars-markdown prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    </div>
  );
}