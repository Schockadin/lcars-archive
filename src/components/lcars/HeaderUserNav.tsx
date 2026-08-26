"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { logout } from "@/app/login/actions";
import { clearServiceWorkerPageCache } from "@/lib/swCache";
import { DB_PERMISSIONS } from "@/lib/permissions";
import {
  ContentNavIcon,
  UsersNavIcon,
  ProfileNavIcon,
  AdminNavIcon,
  LogoutNavIcon,
} from "@/lib/icons";
import { useAnchoredDropdown } from "./useAnchoredDropdown";

interface AdminMenuItem {
  href: string;
  label: string;
  // Recht(e), die den Eintrag freischalten (granulares RBAC, siehe
  // permissions.ts). Ein Array = „mindestens eines davon genügt".
  permission: string | readonly string[];
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
  { href: "/admin/db", label: "DB", permission: DB_PERMISSIONS },
  { href: "/admin/scripts", label: "Scripts", permission: "admin.access" },
  { href: "/admin/rag", label: "RAG", permission: "admin.access" },
  { href: "/admin/content", label: "Inhalte", permission: "content.moderate" },
  { href: "/admin/content/trash", label: "Papierkorb", permission: "content.moderate" },
  { href: "/admin/content/images", label: "Bilder", permission: "content.moderate" },
  { href: "/admin/audit-log", label: "Audit-Log", permission: "admin.access" },
  { href: "/admin/error-log", label: "Fehler-Log", permission: "admin.access" },
  { href: "/admin/import", label: "Import", permission: "admin.access" },
];

// Kleines Icon vor dem Label — im Header/Desktop per CSS ausgeblendet, im
// minimalistischen UI auf Mobile das einzige sichtbare Element (siehe
// minimal-ui.css). aria-hidden, da das Label die Bedeutung trägt.
function NavPillContent({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <>
      <span className="lcars-usernav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="lcars-usernav-label">{label}</span>
    </>
  );
}

export default function HeaderUserNav({
  permissions,
  columns = 3,
  variant = "header",
}: {
  permissions: string[];
  columns?: number;
  // "header": horizontales Pill-Grid im Header (LCARS). "sidebar": vertikale
  // Liste in der Sidebar (minimalistisches UI) — das Admin-Dropdown klappt
  // dann nach rechts auf.
  variant?: "header" | "sidebar";
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
    // Sidebar (minimalistisches UI): Flyout nach rechts statt nach unten.
    placement: variant === "sidebar" ? "right" : "bottom",
  });

  // „Suche" ist bewusst NICHT mehr hier: die Suche hat einen eigenen Eintrag
  // (Lupe) im Hauptmenü (MAIN_NAV/SidebarMenu.tsx), der Header-Button wäre
  // doppelt.
  const tabs = [
    { href: "/user/content", label: "Inhalte", icon: <ContentNavIcon /> },
    ...(permissions.includes("users.browse")
      ? [{ href: "/users", label: "User", icon: <UsersNavIcon /> }]
      : []),
    { href: "/user", label: "Profil", icon: <ProfileNavIcon /> },
  ];

  const isAdminSection = pathname.startsWith("/admin");

  // Ein Staff-Dropdown, dessen Einträge nach Rechten gefiltert werden (statt
  // nach Rolle). Label „Admin“, sobald Admin-Rechte vorhanden sind, sonst
  // „Leitung“. Kein Eintrag berechtigt → kein Dropdown.
  const visibleStaffItems = STAFF_ITEMS.filter((item) =>
    Array.isArray(item.permission)
      ? item.permission.some((p) => permissions.includes(p))
      : permissions.includes(item.permission as string),
  );
  const dropdownItems = visibleStaffItems.length > 0 ? visibleStaffItems : null;
  // „Admin" bei Admin-Rechten, sonst „Leitung" bei GM-Rechten, sonst „DB" (ein
  // reiner db-admin hat weder admin.access noch gm.access).
  const dropdownLabel = permissions.includes("admin.access")
    ? "Admin"
    : permissions.includes("gm.access")
      ? "Leitung"
      : "DB";

  return (
    <nav
      className={`lcars-usernav lcars-usernav--${variant}`}
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
            <NavPillContent icon={tab.icon} label={tab.label} />
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
            <NavPillContent icon={<AdminNavIcon />} label={dropdownLabel} />
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

      <form
        action={logout}
        className="lcars-usernav-form"
        // Vor dem Abmelden den Offline-Seiten-Cache des Service Workers leeren,
        // damit personalisierte Seiten nach dem Logout nicht offline abrufbar
        // bleiben (siehe public/sw.js).
        onSubmit={() => clearServiceWorkerPageCache()}
      >
        <button type="submit" className="lcars-usernav-pill bg-lcars-quinary">
          <NavPillContent icon={<LogoutNavIcon />} label="Logout" />
        </button>
      </form>
    </nav>
  );
}
