"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { User } from "@/types/db";

export default function HeaderUserNav({
  role,
  columns = 3,
}: {
  role: User["role"] | null;
  columns?: number;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/user/content", label: "Inhalte" },
    { href: "/search", label: "Suche" },
    ...(role !== "guest" ? [{ href: "/users", label: "User" }] : []),
    { href: "/user", label: "Profil" },
    ...(role === "gm" || role === "admin"
      ? [{ href: "/admin", label: role === "admin" ? "Admin" : "Leitung" }]
      : []),
  ];

  return (
    <nav
      className="lcars-usernav"
      style={{ "--usernav-cols": columns } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        // /admin selbst redirected nur noch weiter (siehe admin/page.tsx) —
        // ohne startsWith bliebe dieses Pill auf jeder /admin/*-Unterseite
        // unmarkiert, weil pathname dort nie exakt "/admin" ist.
        const isActive =
          pathname === tab.href ||
          (tab.href === "/admin" && pathname.startsWith("/admin/"));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? "lcars-usernav-pill lcars-menu-active"
                : "lcars-usernav-pill"
            }
          >
            {tab.label}
          </Link>
        );
      })}
      <form action={logout} className="lcars-usernav-form">
        <button type="submit" className="lcars-usernav-pill bg-lcars-red">
          Logout
        </button>
      </form>
    </nav>
  );
}
