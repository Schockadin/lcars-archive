"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { logout } from "@/app/login/actions";
import { useAnchoredDropdown } from "./useAnchoredDropdown";

interface AdminMenuItem {
  href: string;
  label: string;
  // Recht, das den Eintrag freischaltet (granulares RBAC, siehe permissions.ts).
  permission: string;
}

// Ein einziges Staff-Dropdown, dessen Einträge NACH RECHTEN gefiltert werden
// (nicht mehr nach Rolle). Ein User mit mehreren Rollen sieht so genau die
// Einträge, für die er berechtigt ist — GM-Werkzeuge (gm.access) und/oder
// Admin-Werkzeuge (admin.access/…), auch beides gleichzeitig. "Kampagne"
// bündelt Ingame-Jahr, Charakter-Zuordnung und Missions-Übersicht.
const STAFF_ITEMS: AdminMenuItem[] = [
  { href: "/admin/campaign", label: "Kampagne", permission: "gm.access" },
  { href: "/admin/dialogues", label: "Gespräche", permission: "gm.access" },
  { href: "/admin/users", label: "User", permission: "users.manage" },
  { href: "/admin/permissions", label: "Rollen", permission: "users.manage" },
  { href: "/admin/db", label: "DB", permission: "admin.access" },
  { href: "/admin/scripts", label: "Scripts", permission: "admin.access" },
  { href: "/admin/content", label: "Inhalte", permission: "content.moderate" },
  { href: "/admin/content/trash", label: "Papierkorb", permission: "content.moderate" },
  { href: "/admin/content/images", label: "Bilder", permission: "content.moderate" },
  { href: "/admin/audit-log", label: "Audit-Log", permission: "admin.access" },
  { href: "/admin/error-log", label: "Fehler-Log", permission: "admin.access" },
  { href: "/admin/import", label: "Import", permission: "admin.access" },
];

export default function HeaderUserNav({
  permissions,
  columns = 3,
}: {
  permissions: string[];
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
    ...(permissions.includes("users.browse")
      ? [{ href: "/users", label: "User" }]
      : []),
    { href: "/user", label: "Profil" },
  ];

  const isAdminSection = pathname.startsWith("/admin");

  // Ein Staff-Dropdown, dessen Einträge nach Rechten gefiltert werden (statt
  // nach Rolle). Label „Admin“, sobald Admin-Rechte vorhanden sind, sonst
  // „Leitung“. Kein Eintrag berechtigt → kein Dropdown.
  const visibleStaffItems = STAFF_ITEMS.filter((item) =>
    permissions.includes(item.permission),
  );
  const dropdownItems = visibleStaffItems.length > 0 ? visibleStaffItems : null;
  const dropdownLabel = permissions.includes("admin.access")
    ? "Admin"
    : "Leitung";

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
