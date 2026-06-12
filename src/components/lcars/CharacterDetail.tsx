import { CharacterFrontmatter } from '@/types/content';

interface CharacterDetailProps {
  character: CharacterFrontmatter;
  htmlContent: string;
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: '● AKTIV', className: 'lcars-card lcars-card-blue' },
    retired: { label: '● PENSIONIERT', className: 'lcars-card' },
    dead: { label: '✗ VERSTORBEN', className: 'lcars-card lcars-card-red' },
  };
  return statusConfig[status] || statusConfig.active;
}

export default function CharacterDetail({ character, htmlContent }: CharacterDetailProps) {
  const statusBadge = getStatusBadge(character.status);

  return (
    <div className="max-w-4xl">
      {/* Meta-Daten Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="lcars-heading text-3xl mb-2">{character.name}</h1>
            <p className="lcars-label">
              {character.race} · {character.role}
            </p>
          </div>
          <div className={`${statusBadge.className} px-4 py-2`}>
            <p className="lcars-label text-xs">{statusBadge.label}</p>
          </div>
        </div>

        {/* Charakterinfo-Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {character.player && (
            <div className="lcars-card">
              <p className="lcars-label mb-1">SPIELER</p>
              <p className="text-lcars-text font-bold">{character.player}</p>
            </div>
          )}
          {character.race && (
            <div className="lcars-card">
              <p className="lcars-label mb-1">RASSE</p>
              <p className="text-lcars-text font-bold">{character.race}</p>
            </div>
          )}
          {character.role && (
            <div className="lcars-card">
              <p className="lcars-label mb-1">ROLLE</p>
              <p className="text-lcars-text font-bold">{character.role}</p>
            </div>
          )}
          {character.first_appearance && (
            <div className="lcars-card">
              <p className="lcars-label mb-1">ERSTE SZENE</p>
              <p className="text-lcars-text font-bold">{character.first_appearance}</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {character.tags && character.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {character.tags.map(tag => (
              <span
                key={tag}
                className="lcars-pill lcars-pill-dim text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Markdown Content */}
      <div
        className="lcars-markdown"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}