"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { logout } from "@/app/login/actions";
import { clearServiceWorkerPageCache } from "@/lib/swCache";
import { DB_PERMISSIONS } from "@/lib/permissions";
import {
  MyCharactersNavIcon,
  ContentNavIcon,
  ProfileNavIcon,
  AdminNavIcon,
  GmNavIcon,
  LogoutNavIcon,
} from "@/lib/icons";
import { useAnchoredDropdown } from "./useAnchoredDropdown";

interface StaffMenuItem {
  href: string;
  label: string;
  // Überschrift, unter der der Eintrag im Dropdown einsortiert wird. Elf
  // Admin-Einträge in einer flachen Liste sind nicht mehr überblickbar.
  group?: string;
  // Recht(e), die den Eintrag freischalten (granulares RBAC, siehe
  // permissions.ts). Ein Array = „mindestens eines davon genügt".
  permission: string | readonly string[];
}

// ZWEI getrennte Staff-Dropdowns statt eines gemischten: „Leitung" führt die
// Werkzeuge der Spielleitung (/gm), „Admin" die der Verwaltung (/admin). Wer
// beide Rollen hat, sieht beide Menüs nebeneinander — die Aufgaben bleiben
// damit auch dann sauber getrennt. Innerhalb eines Menüs werden die Einträge
// weiterhin NACH RECHTEN gefiltert (nicht nach Rolle).
const GM_ITEMS: StaffMenuItem[] = [
  { href: "/gm/campaign", label: "Kampagne", permission: "gm.access" },
  { href: "/gm/sessions", label: "Sessions", permission: "gm.access" },
  { href: "/gm/ap", label: "AP", permission: "gm.access" },
  { href: "/gm/talents", label: "Talente", permission: "gm.access" },
  { href: "/gm/focuses", label: "Schwerpunkte", permission: "gm.access" },
  { href: "/gm/dialogues", label: "Gespräche", permission: "gm.access" },
];

const ADMIN_ITEMS: StaffMenuItem[] = [
  { href: "/admin/users", label: "User", permission: "users.manage", group: "Konten" },
  { href: "/admin/permissions", label: "Rollen", permission: "users.manage", group: "Konten" },
  { href: "/admin/content", label: "Inhalte", permission: "content.moderate", group: "Inhalte" },
  { href: "/admin/content/trash", label: "Papierkorb", permission: "content.moderate", group: "Inhalte" },
  { href: "/admin/content/images", label: "Bilder", permission: "content.moderate", group: "Inhalte" },
  { href: "/admin/changelog", label: "Changelog", permission: "admin.access", group: "Inhalte" },
  { href: "/admin/db", label: "DB", permission: DB_PERMISSIONS, group: "System" },
  { href: "/admin/scripts", label: "Scripts", permission: "admin.access", group: "System" },
  { href: "/admin/rag", label: "RAG", permission: "admin.access", group: "System" },
  { href: "/admin/import", label: "Import", permission: "admin.access", group: "System" },
  { href: "/admin/audit-log", label: "Audit-Log", permission: "admin.access", group: "Protokolle" },
  { href: "/admin/error-log", label: "Fehler-Log", permission: "admin.access", group: "Protokolle" },
];

// Bündelt die (bereits nach Rechten gefilterten) Einträge in der Reihenfolge
// ihres ersten Auftretens zu Gruppen. Einträge ohne Gruppe landen in einem
// Block ohne Überschrift — so bleibt das Leitungs-Menü unverändert flach.
function groupItems(
  items: StaffMenuItem[],
): { group?: string; entries: StaffMenuItem[] }[] {
  const out: { group?: string; entries: StaffMenuItem[] }[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && last.group === item.group) last.entries.push(item);
    else out.push({ group: item.group, entries: [item] });
  }
  return out;
}

function visibleItems(
  items: StaffMenuItem[],
  permissions: string[],
): StaffMenuItem[] {
  return items.filter((item) =>
    Array.isArray(item.permission)
      ? item.permission.some((p) => permissions.includes(p))
      : permissions.includes(item.permission as string),
  );
}

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

// Ein Dropdown-Pill mit seinen Einträgen. Eigene Komponente, weil es davon
// jetzt zwei gibt (Leitung/Admin) und jedes seinen eigenen Öffnungs-Zustand
// und seine eigene Verankerung braucht.
function StaffDropdown({
  label,
  icon,
  items,
  active,
  placement,
}: {
  label: string;
  icon: ReactNode;
  items: StaffMenuItem[];
  // true = der aktuelle Pfad liegt im Bereich dieses Menüs.
  active: boolean;
  placement: "bottom" | "right" | "right-bottom";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  }

  const anchor = useAnchoredDropdown({
    isOpen: open,
    triggerRef,
    panelRef,
    onClose: () => setOpen(false),
    placement,
  });

  return (
    <>
      {/* Das Pill selbst verlinkt bewusst nirgends hin, nur die Einträge im
          Dropdown tun das. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={
          active
            ? "lcars-usernav-pill lcars-menu-active"
            : "lcars-usernav-pill"
        }
      >
        <NavPillContent icon={icon} label={label} />
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={label}
            className="lcars-search-dropdown"
            style={{
              // Je nach placement ist top ODER bottom gesetzt; der jeweils
              // andere Wert ist undefined und wird von React ausgelassen.
              top: anchor.top,
              bottom: anchor.bottom,
              left: anchor.left,
              minWidth: anchor.width,
              maxHeight: anchor.maxHeight,
            }}
          >
            {groupItems(items).map(({ group, entries }) => (
              <div key={group ?? "_"} role="group" aria-label={group}>
                {group && (
                  <div className="lcars-search-group-label">{group}</div>
                )}
                {entries.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={
                      pathname === item.href
                        ? "lcars-search-item lcars-menu-active"
                        : "lcars-search-item"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function HeaderUserNav({
  permissions,
  hasCharacters = false,
  columns = 3,
  variant = "header",
}: {
  permissions: string[];
  // Nur User mit mindestens einem verknüpften Charakter sehen „Charaktere"
  // (/user/characters) — für alle anderen wäre die Seite leer. Ihren ERSTEN
  // Charakter legen sie weiterhin über „Inhalte" an (siehe /user/content).
  hasCharacters?: boolean;
  columns?: number;
  // "header": horizontales Pill-Grid im Header (LCARS). "sidebar": vertikale
  // Liste in der Sidebar (minimalistisches UI) — die Dropdowns klappen dann
  // nach rechts auf, an der Unterkante des Pills verankert (siehe placement).
  variant?: "header" | "sidebar";
}) {
  const pathname = usePathname();

  // „Suche" ist bewusst NICHT mehr hier: die Suche hat einen eigenen Eintrag
  // (Lupe) im Hauptmenü (MAIN_NAV/SidebarMenu.tsx), der Header-Button wäre
  // doppelt.
  const tabs = [
    ...(hasCharacters
      ? [
          {
            href: "/user/characters",
            label: "Charaktere",
            icon: <MyCharactersNavIcon />,
          },
        ]
      : []),
    { href: "/user/content", label: "Inhalte", icon: <ContentNavIcon /> },
    { href: "/user", label: "Profil", icon: <ProfileNavIcon /> },
  ];

  const gmItems = visibleItems(GM_ITEMS, permissions);
  const adminItems = visibleItems(ADMIN_ITEMS, permissions);
  // In der Sidebar (minimalistisches UI) sitzen Leitung/Admin weit unten —
  // das Flyout wird deshalb an der UNTERkante des Pills verankert und wächst
  // nach oben, statt am oberen Rand zu kleben und unten aus dem Bild zu laufen.
  const placement = variant === "sidebar" ? "right-bottom" : "bottom";

  return (
    <nav
      className={`lcars-usernav lcars-usernav--${variant}`}
      style={{ "--usernav-cols": columns } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        // Unterseiten färben ihren Menüpunkt mit ein (z.B.
        // /user/characters/12/stats → „Charaktere"). Ausgenommen ist „Profil"
        // (/user), dessen Pfad Präfix ALLER User-Seiten ist — dort bleibt es
        // beim exakten Vergleich.
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/user" && pathname.startsWith(`${tab.href}/`));
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

      {gmItems.length > 0 && (
        <StaffDropdown
          label="Leitung"
          icon={<GmNavIcon />}
          items={gmItems}
          active={pathname.startsWith("/gm")}
          placement={placement}
        />
      )}

      {adminItems.length > 0 && (
        <StaffDropdown
          label="Admin"
          icon={<AdminNavIcon />}
          items={adminItems}
          active={pathname.startsWith("/admin")}
          placement={placement}
        />
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
