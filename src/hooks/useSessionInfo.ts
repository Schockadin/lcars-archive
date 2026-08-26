"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@/types/db";

export interface SessionInfo {
  userId: number | null;
  role: User["role"] | null;
  permissions?: string[];
}

// Client-seitiges Laden der aktuellen Session (userId/role/permissions) über
// /api/session. Ausgelagert aus HeaderContent, damit sowohl der Header (LCARS)
// als auch die Sidebar-Navigation (minimalistisches UI) dieselbe Logik teilen.
//
// Neu geladen beim ersten Mount sowie bei jedem Routenwechsel, der einen
// Login/Logout bedeuten KANN — beide Server Actions (login/logout) enden mit
// redirect("/") bzw. redirect("/login"), was hier als reiner Pfadwechsel
// ankommt (kein Full-Reload, die Komponente bleibt im Root-Layout gemountet).
// Deshalb genügt: aktueller Pfad ist /login (frisch ausgeloggt) oder vorheriger
// Pfad war /login (frisch eingeloggt). Gibt null zurück, solange noch geladen
// wird (Aufrufer zeigt dann einen Platzhalter).
export function useSessionInfo(): SessionInfo | null {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const prevPathnameRef = useRef<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    const mightHaveChanged =
      !hasFetchedRef.current ||
      pathname === "/login" ||
      prevPathname === "/login";
    if (!mightHaveChanged) return;

    let cancelled = false;
    hasFetchedRef.current = true;
    // cache: "no-store" — verhindert, dass der Browser die personalisierte
    // Antwort (userId/role) aus seinem HTTP-Cache wiederverwendet.
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

  return session;
}
