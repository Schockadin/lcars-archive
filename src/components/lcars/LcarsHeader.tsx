'use client';
import LcarsPill from './LcarsPill';
import { useNeo } from '@/context/useNeo';

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
    <header className="flex w-full h-[var(--lcars-header-h)]">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="flex flex-col w-[var(--lcars-bar-width)] h-full">
          <div className="w-[var(--lcars-bar-width)] bg-[var(--lcars-purple)] h-[50%] mb-[5px]"/>
          <div className="lcars-elbow-top" />
        </div>

        {/* Header Content */}
        <div className="lcars-header-wrapper">

          {/* Menu */}
          <div className="lcars-header-content">
            <div className="flex flex-col justify-center items-end mr-[10px]">
              <div className='lcars-header-text'>
                LCARS / {title}
              </div>
              <div className="grid grid-cols-2 justify-center items-center h-[50%] w-auto">
                  {MAIN_NAV.map(nav => (
                    <LcarsPill id={nav.id} text={nav.label} href={nav.href} key={nav.id} active={activeSection === nav.href.split("/")[1]}/>
                  ))}
              </div>
            </div>
          </div>

          {/* LCARS BAR */}
          <div className="lcars-elbow-bar">
            <div className="w-[35%] h-[20px] bg-[var(--lcars-blue)] mr-[5px]" />
            <div className="w-[5%] h-[20px] bg-[var(--lcars-amber)] mr-[5px]" />
            <div className="w-[20%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
            <div className="w-[35%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
            <div className="w-[5%] h-[20px] bg-[var(--lcars-red)]" />
          </div>


        </div>

      </div>
    </header>
  );
}