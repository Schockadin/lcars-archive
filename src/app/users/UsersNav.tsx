"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { User } from "@/types/db";

// Persistente Navigation für den gesamten User-Bereich (/users/<id>,
// /users/<id>/settings, /users). Zeigt immer auf die eigenen Seiten des
// eingeloggten Users (userId = Session, nicht die aktuell besuchte :id) —
// so bleibt die Navigation auch korrekt, wenn ein GM gerade das Profil
// eines anderen Users betrachtet.
export default function UsersNav({
  userId,
  role,
}: {
  userId: number;
  role: User["role"];
}) {
  const pathname = usePathname();

  const tabs = [
    { href: `/users/${userId}`, label: "Profil" },
    { href: `/users/${userId}/settings`, label: "Einstellungen" },
    ...(role === "gm" ? [{ href: "/users", label: "Nutzerverwaltung" }] : []),
  ];

  return (
    <nav className="flex flex-wrap items-center gap-[10px] pr-[var(--lcars-elbow-size)]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            pathname === tab.href
              ? "lcars-switch lcars-switch--active"
              : "lcars-switch"
          }
        >
          {tab.label}
        </Link>
      ))}
      <form action={logout} className="ml-auto">
        <button type="submit" className="lcars-switch">
          Abmelden
        </button>
      </form>
    </nav>
  );
}
