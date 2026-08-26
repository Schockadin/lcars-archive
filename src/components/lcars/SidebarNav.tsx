"use client";
import Link from "next/link";
import HeaderUserNav from "./HeaderUserNav";
import { useSessionInfo } from "@/hooks/useSessionInfo";
import { LoginNavIcon } from "@/lib/icons";

// Zweiter Navigationsblock in der Sidebar, der NUR im minimalistischen UI
// sichtbar ist (der umschließende Wrapper .lcars-sidebar-usernav wird in
// minimal-ui.css ein-/ausgeblendet). Da es dort keinen Header gibt, wandern die
// bisherigen Header-Menüpunkte (Inhalte/User/Profil, Admin-Dropdown, Logout
// bzw. Anmelden) hierher — „alle Menüpunkte in der linken Sidebar".
//
// Rendert dasselbe HeaderUserNav wie der Header, nur in der Sidebar-Variante
// (vertikal, Admin-Dropdown klappt nach rechts). Die Session wird — wie im
// Header — client-seitig geladen (useSessionInfo), damit das Root-Layout
// statisch bleiben kann.
export default function SidebarNav() {
  const session = useSessionInfo();

  // Solange die Session lädt: nichts rendern (die Hauptnavigation darüber steht
  // bereits). Kein Skeleton nötig — der Block ist ohnehin nur im minimalen UI
  // sichtbar und sekundär.
  if (!session) return null;

  if (session.userId) {
    return (
      <div className="lcars-sidebar-usernav">
        <HeaderUserNav
          permissions={session.permissions ?? []}
          variant="sidebar"
        />
      </div>
    );
  }

  return (
    <div className="lcars-sidebar-usernav">
      <Link href="/login" className="lcars-usernav-pill bg-lcars-senary">
        <span className="lcars-usernav-icon" aria-hidden="true">
          <LoginNavIcon />
        </span>
        <span className="lcars-usernav-label">Anmelden</span>
      </Link>
    </div>
  );
}
