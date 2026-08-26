"use client";
import Link from "next/link";
import HeaderSearch from "./HeaderSearch";
import HeaderUserNav from "./HeaderUserNav";
import HeaderSkeleton from "./HeaderSkeleton";
import { useSessionInfo } from "@/hooks/useSessionInfo";

// Eingeloggte User sehen die UserNav (Pill-Grid, siehe HeaderUserNav) jetzt
// auf JEDER Seite, nicht mehr nur im früheren User-Bereich (/user/**,
// /dialogues/**) — der schnelle Zugriff aufs eigene Dashboard/Settings/etc.
// soll von überall aus möglich sein. Nur wer nicht eingeloggt ist, sieht
// weiterhin den generischen Titel+Suche-Header. Session wird client-seitig
// per Fetch geholt (gleiches Muster wie zuvor SidebarMenu.tsx' Home-Button),
// damit das Root-Layout selbst session-frei (und damit statisch) bleiben
// kann.
//
// Neu geladen wird beim ersten Mount sowie bei jedem Routenwechsel, der
// tatsächlich einen Login/Logout bedeuten KANN — beide Server Actions
// (login/logout, siehe src/app/login/actions.ts) enden mit redirect("/")
// bzw. redirect("/login"), was hier als reiner Pfadwechsel ankommt (kein
// vollständiger Seiten-Reload, HeaderContent bleibt im Root-Layout
// gemountet). Reicht deshalb aus, um genau diese beiden Fälle zu
// erkennen: aktueller Pfad ist /login (frisch ausgeloggt) oder vorheriger
// Pfad war /login (frisch eingeloggt) — jede andere Navigation (z.B. durch
// Missions-Logs klicken) braucht keinen erneuten Fetch, die Session ändert
// sich dabei nicht.
export default function HeaderContent() {
  const session = useSessionInfo();

  // Solange die Session noch lädt: Skeleton-Platzhalter im UserNav-Layout
  // (statt eines leeren Kastens), damit der Header nicht „leer" wirkt.
  if (!session) {
    return (
      <div className="lcars-header-content">
        <HeaderSkeleton columns={3} />
      </div>
    );
  }

  if (session.userId) {
    return (
      <div className="lcars-header-content">
        <HeaderUserNav permissions={session.permissions ?? []} columns={3} />
      </div>
    );
  }

  return (
    <div className="lcars-header-content">
      <div className="lcars-header-top">
        <div className="lcars-header-title uppercase">Neo Archiv</div>
        <Link
          href="/login"
          className="lcars-usernav-pill bg-lcars-senary mr-[8px]"
        >
          Anmelden
        </Link>
      </div>
      <HeaderSearch />
    </div>
  );
}
