"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { SortDir } from "@/components/lcars";
import { SortArrowIcon } from "@/lib/icons";
import { formatDateTime } from "@/utils/formateISODate";
import type { User } from "@/types/db";

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: User["role"];
  is_active: boolean;
  created_at: Date;
  last_login_at: Date | null;
  last_visit_at: Date | null;
}

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

const ROLE_ORDER: Record<User["role"], number> = {
  admin: 0,
  gm: 1,
  player: 2,
  viewer: 3,
  guest: 4,
};

type RoleFilter = "all" | User["role"];
type SortKey = "name" | "role" | "last_login_at" | "last_visit_at";

// Klickbare Spaltenüberschrift statt separatem Sortier-Switch (siehe
// SortSwitch.tsx, dessen Klick-/Pfeil-Logik hier dupliziert wird): erster
// Klick auf eine inaktive Spalte sortiert aufsteigend, jeder weitere Klick
// auf dieselbe Spalte togglet die Richtung.
function SortableHeader({
  label,
  sortKeyValue,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKeyValue: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeKey === sortKeyValue;
  return (
    <th className="pr-[16px] pb-[8px] whitespace-nowrap">
      <button
        type="button"
        onClick={() => onSort(sortKeyValue)}
        className="lcars-eyebrow lcars-sort-switch-label"
      >
        {label}
        {isActive && (
          <span
            className="lcars-sort-switch-arrow"
            style={{
              display: "inline-flex",
              transform: dir === "desc" ? "rotate(180deg)" : undefined,
            }}
          >
            <SortArrowIcon />
          </span>
        )}
      </button>
    </th>
  );
}

// Tabellarische Übersicht analog src/app/users/UsersTable.tsx (Suche,
// Rollenfilter, Sortierung), aber admin-only mit zusätzlichen Spalten
// (E-Mail, Erstellt, Letzter Login, Letzter Besuch) — die Zeilenaktionen
// (Rolle ändern, (de)aktivieren, löschen, ...) liegen bewusst nicht mehr
// inline hier, sondern gebündelt auf /admin/[id]/edit ("Verwalten"-Link).
export default function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (
        q &&
        !u.name.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortKey === "role") {
        return (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) * dir;
      }
      if (sortKey === "last_login_at" || sortKey === "last_visit_at") {
        const av = a[sortKey]?.getTime() ?? 0;
        const bv = b[sortKey]?.getTime() ?? 0;
        return (av - bv) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });
  }, [users, query, roleFilter, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="users-table-toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name oder E-Mail durchsuchen…"
          className="lcars-input rounded-full"
          aria-label="Nach Name oder E-Mail filtern"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="lcars-input rounded-full text-right"
          aria-label="Nach Rolle filtern"
        >
          <option value="all">Alle Rollen</option>
          {(Object.keys(ROLE_LABELS) as User["role"][]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="lcars-empty-state">Keine User für diese Auswahl.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr>
                <SortableHeader
                  label="Name"
                  sortKeyValue="name"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="lcars-eyebrow pr-[16px] pb-[8px] whitespace-nowrap">
                  E-Mail
                </th>
                <SortableHeader
                  label="Rolle"
                  sortKeyValue="role"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="lcars-eyebrow pr-[16px] pb-[8px] whitespace-nowrap">
                  Status
                </th>
                <th className="lcars-eyebrow pr-[16px] pb-[8px] whitespace-nowrap">
                  Erstellt
                </th>
                <SortableHeader
                  label="Letzter Login"
                  sortKeyValue="last_login_at"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Letzter Besuch"
                  sortKeyValue="last_visit_at"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="pb-[8px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-lcars-border">
                  <td className="py-[6px] pr-[16px] whitespace-nowrap font-lcars text-lcars-text-data">
                    {u.name}
                  </td>
                  <td className="py-[6px] pr-[16px] whitespace-nowrap">
                    {u.email}
                  </td>
                  <td className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-text">
                    {ROLE_LABELS[u.role]}
                  </td>
                  <td className="py-[6px] pr-[16px] whitespace-nowrap">
                    {u.is_active ? (
                      "Aktiv"
                    ) : (
                      <span className="text-lcars-red">Deaktiviert</span>
                    )}
                  </td>
                  <td className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-text">
                    {formatDateTime(u.created_at)}
                  </td>
                  <td className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-text">
                    {formatDateTime(u.last_login_at)}
                  </td>
                  <td className="py-[6px] pr-[16px] whitespace-nowrap text-lcars-text">
                    {formatDateTime(u.last_visit_at)}
                  </td>
                  <td className="py-[6px] whitespace-nowrap">
                    <Link
                      href={`/admin/${u.id}/edit`}
                      className="lcars-link-text text-[14px]"
                    >
                      Verwalten
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
