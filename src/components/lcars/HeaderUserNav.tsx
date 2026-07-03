"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { User } from "@/types/db";

// Pill-Grid für den User-Bereich (ersetzt Titel+Suche im Header, siehe
// HeaderContent). userId kommt aus der Session (eigene Seiten des
// eingeloggten Users), nicht aus der ggf. gerade besuchten fremden :id —
// so bleibt die Navigation korrekt, wenn ein GM das Profil eines anderen
// Users betrachtet.
export default function HeaderUserNav({
  userId,
  role,
  columns = 3,
}: {
  userId: number;
  role: User["role"] | null;
  columns?: number;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: `/users/${userId}`, label: "Profil" },
    { href: `/users/${userId}/content`, label: "Meine Inhalte" },
    { href: `/users/${userId}/settings`, label: "Einstellungen" },
    ...(role === "gm" || role === "admin"
      ? [{ href: "/users", label: "Nutzerverwaltung" }]
      : []),
  ];

  return (
    <nav
      className="lcars-usernav"
      style={{ "--usernav-cols": columns } as React.CSSProperties}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            pathname === tab.href
              ? "lcars-usernav-pill lcars-menu-active"
              : "lcars-usernav-pill"
          }
        >
          {tab.label}
        </Link>
      ))}
      <form action={logout} className="lcars-usernav-form">
        <button type="submit" className="lcars-usernav-pill">
          Abmelden
        </button>
      </form>
    </nav>
  );
}
