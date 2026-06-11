// src/components/lcars/DatapadLayout.tsx
import LcarsHeader, { NavItem } from './LcarsHeader';
import LcarsSidebar from './LcarsSidebar';
import LcarsFooter from './LcarsFooter';

interface DatapadLayoutProps {
  children: React.ReactNode;
  title: string;
  nav: NavItem[];
  statusLeft?: string;
  statusRight?: string;
  sidebarAccent?: string;
}

// Feste Navigation — später können wir die aktive Route
// per usePathname() aus next/navigation automatisch ermitteln
export const MAIN_NAV: NavItem[] = [
  { label: 'Charaktere', href: '/characters' },
  { label: 'Aufzeichnungen', href: '/diaries' },
  { label: 'Lore', href: '/lore' },
  { label: 'Orte', href: '/locations' },
  { label: 'Gegenstände', href: '/items' },
  { label: 'Spezies', href: '/species' },
  { label: 'Personen', href: '/persons' },
  { label: 'Verschiedenes', href: '/misc' },
];

export default function DatapadLayout({
  children,
  title,
  nav,
  statusLeft,
  statusRight,
  sidebarAccent,
}: DatapadLayoutProps) {
  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: 'var(--lcars-bg)' }}
    >
      <LcarsHeader title={title} nav={nav} />

      <div className="flex flex-1 overflow-hidden">
        <LcarsSidebar accentColor={sidebarAccent} />

        {/* Scrollbarer Content-Bereich */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <LcarsFooter statusLeft={statusLeft} statusRight={statusRight} />
    </div>
  );
}