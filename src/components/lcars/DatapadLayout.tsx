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
  { label: 'Charaktere', href: '/characters', style:'primary' },
  { label: 'Aufzeichnungen', href: '/diaries', style:'amber' },
  { label: 'Lore', href: '/lore', style: 'blue'},
  { label: 'Orte', href: '/locations' , style:'primary'},
  { label: 'Gegenstände', href: '/items', style:'amber' },
  { label: 'Spezies', href: '/species', style:'blue'},
  { label: 'Personen', href: '/persons', style:'primary'},
  { label: 'Verschiedenes', href: '/misc', style:'amber' },
];

export default function DatapadLayout({
  children,
  title,
  nav,
  statusLeft,
  statusRight,
}: DatapadLayoutProps) {
  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: 'var(--lcars-bg)' }}
    >
      <LcarsHeader title={title} nav={nav} />

      <div className="flex flex-1 overflow-hidden">
        <LcarsSidebar />

        {/* Scrollbarer Content-Bereich */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* {children} */}
        </main>
      </div>

      {/* <LcarsFooter statusLeft={statusLeft} statusRight={statusRight} /> */}
    </div>
  );
}