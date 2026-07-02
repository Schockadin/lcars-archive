import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { logout } from "@/app/login/actions";
import { requireSelfOrGM } from "./dal";
import { getCharactersForUser } from "@/lib/characters";
import { getRecentActivitySince } from "@/lib/timeline";
import DashboardCharacters from "./DashboardCharacters";
import RecentActivity from "./RecentActivity";
import type { User } from "@/types/db";

export const metadata: Metadata = {
  title: "Mein Profil",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<User["role"], string> = {
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { viewer, target, isSelf } = await requireSelfOrGM(id);

  const characters = await getCharactersForUser(target.id);
  const recentEvents = isSelf
    ? await getRecentActivitySince(target.previous_login_at)
    : [];

  return (
    <>
      <PageMeta title={isSelf ? "Mein Profil" : target.name} section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Personendatei</p>
        <h1>{isSelf ? `Willkommen, ${target.name}` : target.name}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            {isSelf ? "Angemeldet als " : "E-Mail "}
            <strong>{target.email}</strong> ({ROLE_LABELS[target.role]}).
          </p>

          <DashboardCharacters characters={characters} />

          {isSelf && (
            <RecentActivity
              events={recentEvents}
              firstVisit={target.previous_login_at === null}
            />
          )}

          {isSelf ? (
            <div className="flex flex-col gap-[8px]">
              <p>
                <Link
                  href={`/users/${target.id}/settings`}
                  className="text-lcars-amber underline"
                >
                  Einstellungen bearbeiten
                </Link>
              </p>
              {viewer.role === "gm" && (
                <p>
                  <Link href="/users" className="text-lcars-amber underline">
                    Zur Nutzerverwaltung
                  </Link>
                </p>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lcars-pill bg-lcars-surface-2 px-[24px] py-[8px] font-lcars uppercase tracking-wide text-lcars-text-contrast"
                >
                  Abmelden
                </button>
              </form>
            </div>
          ) : (
            <p>
              <Link href="/users" className="text-lcars-amber underline">
                ← Zur Nutzerverwaltung
              </Link>
            </p>
          )}
        </div>
      </article>
    </>
  );
}
