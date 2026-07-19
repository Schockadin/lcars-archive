"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { logout } from "@/app/login/actions";
import { useAnchoredDropdown } from "./useAnchoredDropdown";
import type { User } from "@/types/db";

interface AdminMenuItem {
  href: string;
  label: string;
}

const ADMIN_ITEMS: AdminMenuItem[] = [
  { href: "/admin/users", label: "User" },
  { href: "/admin/characters", label: "Charaktere" },
  { href: "/admin/db", label: "DB" },
  { href: "/admin/scripts", label: "Scripts" },
  { href: "/admin/content", label: "Inhalte" },
  { href: "/admin/content/trash", label: "Papierkorb" },
  { href: "/admin/content/images", label: "Bilder" },
  { href: "/admin/audit-log", label: "Audit-Log" },
  { href: "/admin/error-log", label: "Fehler-Log" },
  { href: "/admin/import", label: "Import" },
];

export default function HeaderUserNav({
  role,
  columns = 3,
}: {
  role: User["role"] | null;
  columns?: number;
}) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Navigation (auch per Browser-Zurück) schließt ein offen gebliebenes
  // Dropdown — State-Anpassung während des Renders statt in einem Effect
  // (siehe React-Doku "Adjusting state when a prop changes"), sonst würde
  // ein setState direkt im Effect-Body einen unnötigen Zusatz-Render
  // auslösen.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setAdminOpen(false);
  }

  const anchor = useAnchoredDropdown({
    isOpen: adminOpen,
    triggerRef,
    panelRef,
    onClose: () => setAdminOpen(false),
  });

  const tabs = [
    { href: "/user/content", label: "Inhalte" },
    { href: "/search", label: "Suche" },
    ...(role !== "guest" ? [{ href: "/users", label: "User" }] : []),
    { href: "/user", label: "Profil" },
  ];

  const isAdminSection = pathname.startsWith("/admin");

  return (
    <nav
      className="lcars-usernav"
      style={{ "--usernav-cols": columns } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
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

      {/* Ein reiner gm hat nur ein Ziel (Charakter-Zuordnung) — dafür lohnt
          kein Dropdown, das Pill verlinkt wie bisher direkt. */}
      {role === "gm" && (
        <Link
          href="/admin/characters"
          className={
            isAdminSection
              ? "lcars-usernav-pill lcars-menu-active"
              : "lcars-usernav-pill"
          }
        >
          Leitung
        </Link>
      )}

      {/* Admin: Dropdown statt Direktlink — das Pill selbst verlinkt
          bewusst nirgends hin, nur die Einträge im Dropdown tun das. */}
      {role === "admin" && (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setAdminOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={adminOpen}
            className={
              isAdminSection
                ? "lcars-usernav-pill lcars-menu-active"
                : "lcars-usernav-pill"
            }
          >
            Admin
          </button>

          {adminOpen &&
            anchor &&
            createPortal(
              <div
                ref={panelRef}
                role="menu"
                aria-label="Admin"
                className="lcars-search-dropdown"
                style={{
                  top: anchor.top,
                  left: anchor.left,
                  minWidth: anchor.width,
                }}
              >
                {ADMIN_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setAdminOpen(false)}
                    className={
                      pathname === item.href
                        ? "lcars-search-item lcars-menu-active"
                        : "lcars-search-item"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </div>,
              document.body,
            )}
        </>
      )}

      <form action={logout} className="lcars-usernav-form">
        <button type="submit" className="lcars-usernav-pill bg-lcars-red">
          Logout
        </button>
      </form>
    </nav>
  );
}
