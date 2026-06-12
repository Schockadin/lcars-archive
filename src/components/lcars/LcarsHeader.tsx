'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  style?: 'primary' | 'dim' | 'blue' | 'amber';
}

interface LcarsHeaderProps {
  title: string;
  nav: NavItem[];
  stardate?: string;
}

export default function LcarsHeader({ title, nav }: LcarsHeaderProps) {
  const pathname = usePathname();
  const navWithActive = nav.map((item) => ({
    ...item,
    active: item.href === pathname || pathname.startsWith(item.href + '/'),
  }));

  



  return (
    <header
      style={{ height: 'var(--lcars-header-h)' }}
      className="flex items-stretch w-full"
    >
      {/* Elbow oben links — Markenzeichen des LCARS-Designs */}
      <div className="flex flex-shrink-0 pb-1.5 pl-1.5">
        <Link href="/" className="lcars-elbow-home items-center justify-center" style={{ width: 'var(--lcars-elbow-size)' }}>
          Home
        </Link>
      </div>

      {/* Haupt-Navigationsleiste */}
      <nav
        className="flex-1 flex items-center gap-2 px-4"
        style={{ background: 'var(--lcars-bg)' }}
      >
        {navWithActive.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`lcars-pill ${item.active ? 'lcars-pill-active' : ''} ${item.style ? `lcars-pill-${item.style}` : ''}`}
          >
            {item.label}


          </Link>
        ))}

        {/* Füll-Element */}
        <div className="lcars-heading-empty"/>

        {/* Titel rechtsbündig */}
        <div className="lcars-heading-amber ml-auto h-full w-full text-right">
          {title}
        </div>
      </nav>

      {/* Elbow oben rechts */}
      <div
        className="lcars-elbow-tr bg-lcars-purple-dim flex-shrink-0"
        style={{ width: 'var(--lcars-bar-width)' }}
      />
    </header>
  );
}