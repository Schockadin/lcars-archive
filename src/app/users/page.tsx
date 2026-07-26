import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import { getFollowStatuses } from "@/lib/follows";
import UsersTable from "./UsersTable";

export const metadata: Metadata = {
  title: "User",
  robots: { index: false, follow: false },
};

// Übersicht aller User (außer Gast-Accounts, die dank requireNonGuest im
// Layout diese Seite gar nicht erst betreten) — jede Zeile verlinkt auf das
// öffentliche Profil (/users/[id]) mit den public Inhalten des jeweiligen
// Users. Admins bekommen zusätzlich einen Link in die volle
// Useraccount-Verwaltung (/admin/[id]/edit) — die eigentliche
// Rollen-/Aktivierungs-Verwaltung bleibt dort, nicht hier dupliziert. Jeder
// (außer für die eigene Zeile) bekommt den Subscribe-Button, um über
// zukünftige öffentliche Inhalte des Users benachrichtigt zu werden (siehe
// notifyUserSubscribers in lib/follows.ts). Sortierung/Filterung übernimmt
// UsersTable (Client Component) — bekommt bewusst nur {id,name,slug,role}
// statt des vollen listAllUsers()-Ergebnisses (E-Mail, Login-Zeitstempel, …
// sollen nicht unnötig ins Client-Bundle dieser Seite wandern).
export default async function UsersOverviewPage() {
  const viewer = await requireNonGuest();
  const users = await listAllUsers();
  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    slug: u.slug,
    role: u.role,
  }));
  // Ein gebündelter Follow-Status-Fetch für alle Zeilen statt eines eigenen
  // Fetches pro FollowButtons-Instanz (siehe getFollowStatuses).
  const followStatuses = await getFollowStatuses(
    viewer.id,
    "user",
    rows.map((u) => u.slug),
  );

  return (
    <>
      <PageMeta title="User" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>User</h1>
        <UsersTable
          users={rows}
          viewerId={viewer.id}
          isAdmin={userCan(viewer, "users.manage")}
          followStatuses={followStatuses}
        />
      </article>
    </>
  );
}
