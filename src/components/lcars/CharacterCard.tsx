import Link from 'next/link';
import { CharacterFrontmatter } from '@/types/content';

interface CharacterCardProps {
  character: CharacterFrontmatter;
  slug: string;
}

// Status zu LCARS-Punkt mappen
function getStatusDot(status: string) {
  const statusMap: Record<string, string> = {
    active: 'lcars-dot-active',
    retired: 'lcars-dot-retired',
    dead: 'lcars-dot-dead',
  };
  return statusMap[status] || 'lcars-dot-active';
}

export default function CharacterCard({ character, slug }: CharacterCardProps) {
  return (
    <Link href={`/characters/${slug}`}>
      <div className="lcars-card hover:bg-lcars-surface-2 transition cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <p className="lcars-label">{character.role?.toUpperCase()}</p>
          <div className={`lcars-dot ${getStatusDot(character.status)}`} />
        </div>

        <h3 className="text-lcars-text font-bold mb-1">
          {character.name}
        </h3>

        <p className="lcars-data text-xs">
          {character.race} · {character.player}
        </p>

        {character.first_appearance && (
          <p className="lcars-data text-xs mt-1">
            Seit: {character.first_appearance}
          </p>
        )}
      </div>
    </Link>
  );
}