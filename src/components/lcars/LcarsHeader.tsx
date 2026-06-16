'use client';
import LcarsPill from './LcarsPill';
import { useNeo } from '@/context/useNeo';
import Link from 'next/link';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { id: '01', label: 'Charaktere', href: '/characters'},
  { id: '02', label: 'Missionen', href: '/missions'},
  { id: '03', label: 'Archiv', href: '/archive'},
  { id: '04', label: 'Timeline', href: '/timeline'}, 
];  

export default function LcarsHeader() {
  const { title, activeSection } = useNeo();

  return (
    <header className="flex">
      {/* Sidebar */}
      <div className="flex flex-col h-full gap-[5px]">
        <Link href="/" className='decoration-none'>
          <div className="header-side-top"/>
        </Link>
        <div className="header-side-bottom"/>
      </div>

      {/* Titelbox */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: "24px",
        paddingBottom: "2px",
      }}>
        <div style={{
          fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "11px",
          letterSpacing: "0.25em",
          color: "var(--lcars-orange)",
          opacity: 0.6,
          marginBottom: "2px",
        }}>
          ARCHIV-TERMINAL · SEKTION 7
        </div>
        <div style={{
          fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "var(--lcars-amber)",
          lineHeight: 1,
        }}>
          NEOVERSE
        </div>
      </div>

      {/* Leerfeld */}
      <div className="flex-grow" />

      {/* Menu */}
      <div className="grid grid-cols-2 justify-center items-center mr-[16px]">
          {MAIN_NAV.map(nav => (
            <LcarsPill id={nav.id} text={nav.label} href={nav.href} key={nav.id} active={activeSection === nav.href.split("/")[1]}/>
          ))}
      </div>
    </header>
  );
}