"use client";
import { useEffect, useState } from "react";
import { useNeo } from "@/hooks/useNeo";
import { MAIN_NAV } from "@/lib/nav";
import LcarsMenuItem from "./MenuItem";

// Für eingeloggte User soll "Home" zum eigenen Dashboard führen statt zur
// öffentlichen Startseite. Das wird bewusst client-seitig per Fetch gelöst
// (statt im Root-Layout per cookies() zu prüfen): ein Dynamic-API-Zugriff
// dort würde die komplette Seite (Charaktere, Missionen, Archiv, Timeline,
// Home) zwingend dynamisch machen und die aktuell statische Auslieferung
// über Netlifys CDN verlieren. Die Sidebar bleibt Teil des persistenten
// Root-Layouts und wird bei Client-Navigation nicht neu gemountet — der
// Fetch läuft also nur einmal pro Besuch, nicht bei jedem Seitenwechsel.
export default function SideBarMenu() {
  const { activeSection } = useNeo();
  const [homeHref, setHomeHref] = useState("/");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: { userId?: number | null }) => {
        if (!cancelled && data.userId != null) {
          setHomeHref(`/users/${data.userId}`);
        }
      })
      .catch(() => {
        // Bleibt bei "/" — kein hartes Fehlverhalten für eine reine
        // Komfort-Umleitung nötig.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="lcars-elbow-bottom h-[150px]" />
        <div className="flex flex-col items-stretch flex-1 min-h-0">
          {MAIN_NAV.map((nav) => {
            const href = nav.id === "00" ? homeHref : nav.href;
            return (
              <LcarsMenuItem
                id={nav.id}
                text={nav.label}
                href={href}
                key={nav.id}
                active={activeSection === href.split("/")[1]}
                type="bar"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
