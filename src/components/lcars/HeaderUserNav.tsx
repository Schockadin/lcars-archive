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

// Charaktere/Missionen/Gespräche bewusst NICHT im Admin-Menü (nur im
// GM-Menü unten) — die drei sind Spielleitungs-Werkzeuge; ein Admin
// erreicht sie bei Bedarf weiterhin direkt per URL (requireGM lässt Admins
// ohnehin durch), soll sie aber nicht im eigenen Menü angeboten bekommen.
const ADMIN_ITEMS: AdminMenuItem[] = [
  { href: "/admin/users", label: "User" },
  { href: "/admin/db", label: "DB" },
  { href: "/admin/scripts", label: "Scripts" },
  { href: "/admin/content", label: "Inhalte" },
  { href: "/admin/content/trash", label: "Papierkorb" },
  { href: "/admin/content/images", label: "Bilder" },
  { href: "/admin/audit-log", label: "Audit-Log" },
  { href: "/admin/error-log", label: "Fehler-Log" },
  { href: "/admin/import", label: "Import" },
];

// GM-Dropdown (analog zum Admin-Dropdown oben, nur drei Ziele): die
// Charakterzuordnung gab es vorher schon (bisheriges Direkt-Pill "Leitung"),
// Missionen/Gespräche sind neu — GM sieht damit erstmals auch Missionen/
// Dialoge, an denen er nicht selbst beteiligt ist, an einem Ort.
const GM_ITEMS: AdminMenuItem[] = [
  { href: "/admin/missions", label: "Missionen" },
  { href: "/admin/characters", label: "Charaktere" },
  { href: "/admin/dialogues", label: "Gespräche" },
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

  // Gemeinsames Dropdown für GM und Admin (unterschiedliche Item-Listen,
  // gleiche UI) — role admin/gm schließen sich gegenseitig aus, daher genügt
  // ein einzelner Dropdown-State/Trigger für beide.
  const dropdownItems =
    role === "admin" ? ADMIN_ITEMS : role === "gm" ? GM_ITEMS : null;
  const dropdownLabel = role === "admin" ? "Admin" : "Leitung";

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

      {/* GM/Admin: Dropdown statt Direktlink — das Pill selbst verlinkt
          bewusst nirgends hin, nur die Einträge im Dropdown tun das. GM
          bekam bis vor Kurzem ein einzelnes Direkt-Pill (nur
          Charakterzuordnung) — jetzt analog zum Admin-Dropdown, seit GM auch
          Missionen/Gespräche über eigene Übersichten erreicht. */}
      {dropdownItems && (
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
            {dropdownLabel}
          </button>

          {adminOpen &&
            anchor &&
            createPortal(
              <div
                ref={panelRef}
                role="menu"
                aria-label={dropdownLabel}
                className="lcars-search-dropdown"
                style={{
                  top: anchor.top,
                  left: anchor.left,
                  minWidth: anchor.width,
                }}
              >
                {dropdownItems.map((item) => (
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
