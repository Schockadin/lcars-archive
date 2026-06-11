// src/components/lcars/LcarsHeader.tsx
import Link from 'next/link';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface LcarsHeaderProps {
  title: string;
  nav: NavItem[];
  stardate?: string;
}

export default function LcarsHeader({ title, nav }: LcarsHeaderProps) {
  return (
    <header
      style={{ height: 'var(--lcars-header-h)' }}
      className="flex items-stretch w-full"
    >
      {/* Elbow oben links — Markenzeichen des LCARS-Designs */}
      <div
        className="lcars-elbow-tl bg-lcars-purple flex-shrink-0 flex items-end pb-1.5 pl-4"
        style={{ width: 'var(--lcars-elbow-size)' }}
      >
      </div>

      {/* Haupt-Navigationsleiste */}
      <nav
        className="flex-1 flex items-center gap-2 px-4 border-b-2 border-lcars-purple"
        style={{ background: 'var(--lcars-bg)' }}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`lcars-pill ${
              item.active ? 'lcars-pill-primary' : 'lcars-pill-dim'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {/* Titel rechtsbündig */}
        <span className="lcars-heading ml-auto text-base">
          {title}
        </span>
      </nav>

      {/* Elbow oben rechts */}
      <div
        className="lcars-elbow-tr bg-lcars-purple-dim flex-shrink-0"
        style={{ width: 'var(--lcars-bar-width)' }}
      />
    </header>
  );
}