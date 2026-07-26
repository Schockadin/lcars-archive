"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import HeaderSearch from "./HeaderSearch";
import HeaderUserNav from "./HeaderUserNav";
import type { User } from "@/types/db";

interface SessionInfo {
  userId: number | null;
  role: User["role"] | null;
  permissions?: string[];
}

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
  const pathname = usePathname();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const prevPathnameRef = useRef<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    const mightHaveChanged =
      !hasFetchedRef.current || pathname === "/login" || prevPathname === "/login";
    if (!mightHaveChanged) return;

    let cancelled = false;
    hasFetchedRef.current = true;
    // cache: "no-store" — zusätzlich zu den No-Store-Response-Headern in
    // /api/session/route.ts: verhindert, dass der Browser selbst diese
    // personalisierte Antwort (userId/role) aus seinem HTTP-Cache
    // wiederverwendet, statt jedes Mal frisch nachzufragen.
    fetch("/api/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: SessionInfo) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession({ userId: null, role: null });
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Kein Flackern: solange die Session noch lädt, nichts rendern (weder
  // UserNav noch den generischen Header).
  if (!session) {
    return <div className="lcars-header-content" />;
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
          className="lcars-usernav-pill bg-lcars-green mr-[8px]"
        >
          Anmelden
        </Link>
      </div>
      <HeaderSearch />
    </div>
  );
}
