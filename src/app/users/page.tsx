import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { listAllUsers } from "@/lib/users";
import FollowButtons from "@/components/FollowButtons";
import type { User } from "@/types/db";

export const metadata: Metadata = {
  title: "User",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

// Übersicht aller User (außer Gast-Accounts, die dank requireNonGuest im
// Layout diese Seite gar nicht erst betreten) — jede Zeile verlinkt auf das
// öffentliche Profil (/users/[id]) mit den public Inhalten des jeweiligen
// Users. Admins bekommen zusätzlich einen Link in die volle
// Useraccount-Verwaltung (/admin/[id]/edit) — die eigentliche
// Rollen-/Aktivierungs-Verwaltung bleibt dort, nicht hier dupliziert. Jeder
// (außer für die eigene Zeile) bekommt den Subscribe-Button, um über
// zukünftige öffentliche Inhalte des Users benachrichtigt zu werden (siehe
// notifyUserSubscribers in lib/follows.ts).
export default async function UsersOverviewPage() {
  const viewer = await requireNonGuest();
  const users = await listAllUsers();

  return (
    <>
      <PageMeta title="User" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>User</h1>
        <div className="lcars-text flex flex-col gap-[12px]">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-[12px] border-b border-lcars-border pb-[12px]"
            >
              <Link
                href={`/users/${u.id}`}
                className="font-lcars text-lcars-text-data underline"
              >
                {u.name}
              </Link>
              <span className="text-lcars-text-dim">
                {ROLE_LABELS[u.role]}
              </span>
              {viewer.role === "admin" && (
                <Link
                  href={`/admin/${u.id}/edit`}
                  className="lcars-link-text text-[14px]"
                >
                  Verwalten
                </Link>
              )}
              {u.id !== viewer.id && (
                <FollowButtons
                  targetType="user"
                  targetSlug={u.slug}
                  subscribeOnly
                />
              )}
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
