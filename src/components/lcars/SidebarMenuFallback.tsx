import { MAIN_NAV } from "@/lib/nav";
import {
  HomeNavIcon,
  CharactersNavIcon,
  MissionsNavIcon,
  ArchiveNavIcon,
  SearchNavIcon,
} from "@/lib/icons";
import LcarsMenuItem from "./MenuItem";
import type { ReactNode } from "react";

// Statischer Fallback für <SideBarMenu/> (Suspense-Grenze in Sidebar.tsx).
// SidebarMenu liest usePathname() für die Aktiv-Markierung — unter
// cacheComponents ist das auf Routen mit dynamischem Parameter erst nach der
// Hydration verfügbar (siehe Next-Doku zu usePathname). Damit die statische
// Shell die Navigation trotzdem vollständig zeigt (statt eines leeren
// Kastens), rendert dieser Fallback dieselben Menüpunkte ohne Aktiv-Zustand;
// die interaktive Variante mit Highlight übernimmt nach der Hydration.
const NAV_ICONS: Record<string, ReactNode> = {
  "/": <HomeNavIcon />,
  "/characters": <CharactersNavIcon />,
  "/missions": <MissionsNavIcon />,
  "/archive": <ArchiveNavIcon />,
  "/search": <SearchNavIcon />,
};

export default function SidebarMenuFallback() {
  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="lcars-elbow-bottom" />
        <div className="flex flex-col items-stretch flex-1 min-h-0">
          {MAIN_NAV.map((nav) => (
            <LcarsMenuItem
              id={nav.id}
              text={nav.label}
              href={nav.href}
              icon={NAV_ICONS[nav.href]}
              key={nav.id}
              active={false}
              type="bar"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
