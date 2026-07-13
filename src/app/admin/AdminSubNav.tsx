"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Pill-Reihe für die Admin-Unterseiten, optisch im Stil der Header-Usernav
// (gleiche Grundform/Typografie, siehe kombinierte Regel für .lcars-pill-btn/
// .lcars-usernav-pill in controls.css) — bewusst NICHT die .lcars-usernav-
// Grid-Klasse selbst, die ist über flex:1/min-height:0 fest an die feste
// Höhe der Header-Zeile gekoppelt und im normalen Seiteninhalt hier nicht
// nutzbar.
export default function AdminSubNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const tabs = isAdmin
    ? [
        { href: "/admin/users", label: "User" },
        { href: "/admin/characters", label: "Charaktere" },
        { href: "/admin/db", label: "DB" },
        { href: "/admin/scripts", label: "Scripts" },
        { href: "/admin/content", label: "Inhalte" },
        { href: "/admin/audit-log", label: "Audit-Log" },
      ]
    : [{ href: "/admin/characters", label: "Charaktere" }];

  return (
    <nav className="flex flex-wrap gap-[8px]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            pathname === tab.href
              ? "lcars-pill-btn lcars-menu-active"
              : "lcars-pill-btn"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
