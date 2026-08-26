"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsSortSwitch, type SortDir } from "@/components/lcars";
import FollowButtons from "@/components/FollowButtons";
import type { User } from "@/types/db";
import type { FollowStatus } from "@/lib/follows";

export interface UserRow {
  id: number;
  name: string;
  slug: string;
  role: User["role"];
}

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

type RoleFilter = "all" | User["role"];
type SortKey = "name" | "role";

const ROLE_ORDER: Record<User["role"], number> = {
  admin: 0,
  gm: 1,
  player: 2,
  viewer: 3,
  guest: 4,
};

// Sortier-/Filterbare User-Tabelle (Name durchsuchbar, Rolle als Dropdown-
// Filter, Sortierung nach Name oder Rolle) statt der früheren, unsortierten
// Flat-Liste — wächst die Nutzerzahl, wird eine reine Liste schnell unhandlich.
// users kommt bewusst schon auf {id,name,slug,role} eingedampft von der
// Server Component (siehe page.tsx) statt des vollen UserWithCharacters-Objekts
// (E-Mail, Login-Zeitstempel, …) — die würden sonst unnötig ins Client-Bundle
// dieser Seite wandern.
export default function UsersTable({
  users,
  viewerId,
  isAdmin,
  followStatuses,
}: {
  users: UserRow[];
  viewerId: number;
  isAdmin: boolean;
  // Gebündelt von der Server Component vorgeladen (siehe getFollowStatuses
  // in lib/follows.ts) statt eines eigenen Fetches pro FollowButtons-Zeile.
  followStatuses: Record<string, FollowStatus>;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (q && !u.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortKey === "role") {
        return (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) * dir;
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
          placeholder="Name durchsuchen…"
          className="lcars-input rounded-full"
          aria-label="Nach Name filtern"
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
        <LcarsSortSwitch
          className="flex"
          options={[
            { key: "name", label: "Name" },
            { key: "role", label: "Rolle" },
          ]}
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(key, dir) => {
            setSortKey(key);
            setSortDir(dir);
          }}
        />
      </div>

      {rows.length === 0 ? (
        <p className="lcars-empty-state">Keine User für diese Auswahl.</p>
      ) : (
        <div className="users-table">
          {rows.map((u) => (
            <div key={u.id} className="users-table-row">
              <Link
                href={`/users/${u.id}`}
                className="users-table-name font-lcars text-lcars-ink-data underline"
              >
                {u.name}
              </Link>
              <span className="users-table-role text-lcars-ink-dim">
                {ROLE_LABELS[u.role]}
              </span>
              <div className="users-table-actions">
                {isAdmin && (
                  <Link
                    href={`/admin/${u.id}/edit`}
                    className="lcars-link-text text-[14px]"
                  >
                    Verwalten
                  </Link>
                )}
                {u.id !== viewerId && (
                  <FollowButtons
                    targetType="user"
                    targetSlug={u.slug}
                    subscribeOnly
                    showShare={false}
                    initialState={{
                      loggedIn: true,
                      bookmarked: followStatuses[u.slug]?.bookmarked ?? false,
                      subscribed: followStatuses[u.slug]?.subscribed ?? false,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
