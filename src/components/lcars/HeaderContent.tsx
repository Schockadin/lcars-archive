"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import HeaderSearch from "./HeaderSearch";
import HeaderUserNav from "./HeaderUserNav";
import type { User } from "@/types/db";

interface SessionInfo {
  userId: number | null;
  role: User["role"] | null;
}

// Eingeloggte User sehen die UserNav (Pill-Grid, siehe HeaderUserNav) jetzt
// auf JEDER Seite, nicht mehr nur im früheren User-Bereich (/user/**,
// /dialogues/**) — der schnelle Zugriff aufs eigene Dashboard/Settings/etc.
// soll von überall aus möglich sein. Nur wer nicht eingeloggt ist, sieht
// weiterhin den generischen Titel+Suche-Header. Session wird client-seitig
// per Fetch geholt (gleiches Muster wie zuvor SidebarMenu.tsx' Home-Button),
// damit das Root-Layout selbst session-frei (und damit statisch) bleiben
// kann. Erneutes Fetchen bei jedem Routenwechsel (nicht nur beim ersten
// Mount) — robuster gegenüber einem Login/Logout als ein reiner
// Once-per-Mount-Effekt.
export default function HeaderContent() {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
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
        <HeaderUserNav
          userId={session.userId}
          role={session.role}
          columns={3}
        />
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
