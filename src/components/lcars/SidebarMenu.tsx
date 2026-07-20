"use client";
import { useNeo } from "@/hooks/useNeo";
import { MAIN_NAV } from "@/lib/nav";
import LcarsMenuItem from "./MenuItem";

// "Home" führt direkt auf "/" (zeigt je nach Login-Status Dashboard oder
// Landingpage, siehe app/page.tsx) — /home bleibt nur noch als Redirect für
// alte Links/Lesezeichen bestehen (next.config.ts), damit ein Klick hier
// nicht den zusätzlichen Redirect-Hop auslöst (der bei der RSC-Prefetch-
// Navigation zu einem "Failed to fetch RSC payload"-Fehler führte, da
// next.config.ts-Redirects keine eigene RSC-Route haben). Die UserNav
// (siehe HeaderContent.tsx) ist jetzt für eingeloggte User auf jeder Seite
// eingeblendet und übernimmt den schnellen Zugriff aufs eigene Dashboard,
// ein Dashboard-Shortcut hier ist deshalb nicht mehr nötig.
export default function SideBarMenu() {
  const { activeSection } = useNeo();

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
              key={nav.id}
              // "/" hat keinen Pfad-Segment-Namen (split("/")[1] wäre "") —
              // Dashboard/Landingpage setzen ihren PageMeta-Section-Wert
              // fest auf "home" (siehe Dashboard.tsx/LandingPage.tsx), das
              // muss hier für href "/" explizit nachgebildet werden.
              active={
                activeSection ===
                (nav.href === "/" ? "home" : nav.href.split("/")[1])
              }
              type="bar"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
