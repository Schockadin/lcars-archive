"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { User } from "@/types/db";

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
    { href: `/user/${userId}/content`, label: "Inhalte" },
    { href: "/search", label: "Suche" },
    ...(role !== "guest" ? [{ href: "/users", label: "User" }] : []),
    { href: `/user/${userId}`, label: "Profil" },
    ...(role === "gm" || role === "admin"
      ? [{ href: "/admin", label: role === "admin" ? "Admin" : "Leitung" }]
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
        <button type="submit" className="lcars-usernav-pill bg-lcars-red">
          Logout
        </button>
      </form>
    </nav>
  );
}
