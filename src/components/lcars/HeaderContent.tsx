"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import HeaderSearch from "./HeaderSearch";
import HeaderUserNav from "./HeaderUserNav";
import { logout } from "@/app/login/actions";
import type { User } from "@/types/db";

interface SessionInfo {
  userId: number | null;
  role: User["role"] | null;
}

// Im User-Bereich (/users/**, /dialogues/**) weicht der generische
// Titel+Suche-Header einem Pill-Grid mit der User-Navigation — siehe
// HeaderUserNav. Session wird client-seitig per Fetch geholt (gleiches
// Muster wie SidebarMenu.tsx' Home-Button), damit das Root-Layout selbst
// session-frei (und damit statisch) bleiben kann. Erneutes Fetchen bei
// jedem Routenwechsel (nicht nur beim ersten Mount) — robuster gegenüber
// einem Login/Logout als ein reiner Once-per-Mount-Effekt, und wird jetzt
// auch außerhalb des User-Bereichs gebraucht (Anmelden-/Abmelden-Button
// oben rechts im Standard-Header).
export default function HeaderContent() {
  const pathname = usePathname();
  const userArea =
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname.startsWith("/dialogues/");

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

  if (userArea) {
    // Kein Flackern: solange die Session noch lädt, nichts rendern.
    if (!session?.userId) return <div className="lcars-header-content" />;
    return (
      <div className="lcars-header-content">
        <HeaderUserNav userId={session.userId} role={session.role} columns={3} />
      </div>
    );
  }

  return (
    <div className="lcars-header-content">
      <div className="lcars-header-top">
        <div className="lcars-header-title uppercase">Neo Archiv</div>
        {session &&
          (session.userId ? (
            <form action={logout}>
              <button type="submit" className="lcars-switch">
                Abmelden
              </button>
            </form>
          ) : (
            <Link href="/login" className="lcars-switch">
              Anmelden
            </Link>
          ))}
      </div>
      <HeaderSearch />
    </div>
  );
}
