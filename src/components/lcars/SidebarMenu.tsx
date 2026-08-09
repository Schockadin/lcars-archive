"use client";
import {
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { MAIN_NAV } from "@/lib/nav";
import {
  HomeNavIcon,
  CharactersNavIcon,
  MissionsNavIcon,
  ArchiveNavIcon,
  SearchNavIcon,
} from "@/lib/icons";
import LcarsMenuItem from "./MenuItem";

// Icon je Navigationsziel — auf Mobile (Menütext ausgeblendet) wird es statt
// der reinen Nummer angezeigt, damit die Einträge wiedererkennbar bleiben.
const NAV_ICONS: Record<string, ReactNode> = {
  "/": <HomeNavIcon />,
  "/characters": <CharactersNavIcon />,
  "/missions": <MissionsNavIcon />,
  "/archive": <ArchiveNavIcon />,
  "/search": <SearchNavIcon />,
};

// Aktuelle Sektion aus dem Pfad ableiten — "/" ist die Startseite ("home"),
// sonst zählt das erste Pfadsegment (/characters/... → "characters"). Der
// Pfad aktualisiert sich synchron mit dem Commit der Navigation, anders als
// der effekt-gesetzte activeSection aus useNeo (der erst nach dem Rendern der
// Zielseite nachzieht) — das macht den Reset bei Fehlern flackerfrei.
function sectionOf(href: string): string {
  return href === "/" ? "home" : href.split("/")[1];
}

// "Home" führt direkt auf "/" (zeigt je nach Login-Status Dashboard oder
// Landingpage, siehe app/page.tsx). Die UserNav (siehe HeaderContent.tsx) ist
// für eingeloggte User auf jeder Seite eingeblendet und übernimmt den
// schnellen Zugriff aufs eigene Dashboard.
export default function SideBarMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistisch markierte Sektion: wird beim Klick sofort gesetzt, damit der
  // Menüpunkt ohne Wartezeit aktiv erscheint. Sie zählt nur, solange die
  // Navigation läuft (isPending) — danach übernimmt wieder die aus dem Pfad
  // abgeleitete Sektion: bei Erfolg das Ziel, bei Fehler unverändert die alte
  // Seite (automatischer Reset, ganz ohne Aufräum-Effekt).
  const [optimistic, setOptimistic] = useState<string | null>(null);

  const currentSection = sectionOf(pathname);
  const shownSection = isPending && optimistic ? optimistic : currentSection;

  function handleNavigate(href: string, section: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
      // Modifizierte Klicks (neuer Tab/Fenster) und Nicht-Linksklicks der
      // normalen Link-Navigation überlassen; ebenso ein Klick auf die bereits
      // aktive Sektion (nichts zu tun).
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        section === currentSection
      ) {
        return;
      }
      e.preventDefault();
      setOptimistic(section);
      startTransition(() => {
        router.push(href);
      });
    };
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="lcars-elbow-bottom" />
        <div className="flex flex-col items-stretch flex-1 min-h-0">
          {MAIN_NAV.map((nav) => {
            const section = sectionOf(nav.href);
            return (
              <LcarsMenuItem
                id={nav.id}
                text={nav.label}
                href={nav.href}
                icon={NAV_ICONS[nav.href]}
                key={nav.id}
                active={shownSection === section}
                onClick={handleNavigate(nav.href, section)}
                type="bar"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
