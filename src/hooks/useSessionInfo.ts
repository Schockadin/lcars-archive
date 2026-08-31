"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@/types/db";

export interface SessionInfo {
  userId: number | null;
  role: User["role"] | null;
  permissions?: string[];
  // Ob mit dem Konto mindestens ein Charakter verknüpft ist — schaltet den
  // „Charaktere"-Menüpunkt frei (siehe HeaderUserNav).
  hasCharacters?: boolean;
}

// Client-seitiges Laden der aktuellen Session (userId/role/permissions) über
// /api/session. Ausgelagert aus HeaderContent, damit sowohl der Header (LCARS)
// als auch die Sidebar-Navigation (minimalistisches UI) dieselbe Logik teilen.
//
// Beide Consumer (HeaderContent UND SidebarNav) sind IMMER gemountet (nur per
// CSS ein-/ausgeblendet, nie unmounted). Damit /api/session nicht doppelt
// getroffen wird (getUserById + getRoleMap + touchLastVisit, plus Contention
// auf der einen DB-Verbindung), teilen sich alle Hook-Instanzen EINEN
// modulweiten Store; gelesen wird er über useSyncExternalStore (kein Tearing
// unter Concurrent Rendering, keine manuelle Re-Render-Verwaltung).

// Fail-safe-Standard bei Ladefehlern: als abgemeldet gelten (nie versehentlich
// eingeloggte/Admin-Navigation zeigen). Konstante Referenz, damit wiederholte
// Fehlerzustände kein unnötiges Re-Render auslösen.
const ANONYMOUS: SessionInfo = { userId: null, role: null };

let sharedSession: SessionInfo | null = null;
// Ob je ein Ergebnis vorliegt (erfolgreich ODER als „anonym" abgeschlossen).
let hasData = false;
// Generationszähler: die jeweils NEUESTE Anfrage gewinnt. Ein durch einen
// Login/Logout-Wechsel erzwungener Refetch macht so eine noch laufende, evtl.
// veraltete Anfrage ungültig (deren Antwort wird verworfen).
let latestFetchId = 0;
let inflightId = 0;
// Pfad, für den die laufende Anfrage gestartet wurde — dient dazu, die
// gleichzeitig feuernden Effects beider Consumer bei EINEM Login/Logout-Wechsel
// zu EINER Anfrage zusammenzufassen.
let inflightPath: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

// force=false: nur laden, wenn es noch keine Daten gibt und nichts läuft
// (Erst-Load, über alle Consumer dedupliziert).
// force=true (Login/Logout-Wechsel): eine neue Anfrage starten, die eine noch
// laufende ältere ersetzt — ABER nicht doppelt, wenn bereits eine Anfrage für
// GENAU diesen Pfadwechsel läuft (die beiden Consumer feuern denselben Effect).
function fetchSession(pathname: string, force: boolean): void {
  if (!force) {
    if (hasData || inflightId !== 0) return;
  } else if (inflightId !== 0 && inflightPath === pathname) {
    return;
  }

  const id = ++latestFetchId;
  inflightId = id;
  inflightPath = pathname;
  // cache: "no-store" — verhindert, dass der Browser die personalisierte
  // Antwort (userId/role) aus seinem HTTP-Cache wiederverwendet.
  fetch("/api/session", { cache: "no-store" })
    .then((res) => {
      // Nicht-2xx (z.B. 401/500 mit JSON-Body) NICHT als gültige Session
      // durchwinken — als Fehler behandeln (→ catch → anonym).
      if (!res.ok) throw new Error(`session request failed: ${res.status}`);
      return res.json();
    })
    .then((data: SessionInfo) => {
      if (id !== latestFetchId) return; // von einer neueren Anfrage überholt
      sharedSession = data;
      hasData = true;
    })
    .catch(() => {
      if (id !== latestFetchId) return;
      // Fail-safe: als abgemeldet gelten. Ein Refetch wird nur bei einem
      // Login/Logout-Wechsel ausgelöst, wo „abgemeldet" der sichere Default ist.
      sharedSession = ANONYMOUS;
      hasData = true;
    })
    .finally(() => {
      if (inflightId === id) {
        inflightId = 0;
        inflightPath = null;
      }
      emit();
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SessionInfo | null {
  return sharedSession;
}

// SSR: es wird nie serverseitig geladen (Effects laufen dort nicht), der Store
// bleibt null — konsistent mit dem ersten Client-Render (kein Hydration-Mismatch).
function getServerSnapshot(): SessionInfo | null {
  return null;
}

export function useSessionInfo(): SessionInfo | null {
  const pathname = usePathname();
  const session = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Erster Mount irgendeines Consumers → einmal laden (dedupliziert).
    // Login/Logout-Wechsel (aktueller oder vorheriger Pfad ist /login) →
    // erzwungener Refetch (über inflightPath zu EINER Anfrage zusammengefasst).
    const isAuthTransition =
      prevPathname !== null &&
      (pathname === "/login" || prevPathname === "/login");
    fetchSession(pathname, isAuthTransition);
  }, [pathname]);

  return session;
}
