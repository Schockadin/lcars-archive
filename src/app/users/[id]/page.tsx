import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireSelfOrGM } from "./dal";
import { hasPassword } from "@/lib/users";
import { getBookmarkedContent, getSubscribedContent } from "@/lib/follows";
import { getRecentActivity } from "@/lib/recentActivity";
import FollowedContentSection from "./FollowedContentSection";
import RecentActivity from "./RecentActivity";
import InstallPwaPrompt from "./InstallPwaPrompt";
import type { User } from "@/types/db";

export const metadata: Metadata = {
  title: "Mein Profil",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { viewer, target, isSelf } = await requireSelfOrGM(id);

  // Voneinander unabhängig — parallel statt nacheinander abfragen, sonst
  // addieren sich die Roundtrips zur (entfernten) DB bei jeder Navigation
  // innerhalb des User-Bereichs spürbar auf.
  const [hasPasswordSet, bookmarks, subscriptions, recentActivity] =
    await Promise.all([
      isSelf ? hasPassword(target.id) : Promise.resolve(true),
      isSelf ? getBookmarkedContent(target.id) : Promise.resolve([]),
      isSelf ? getSubscribedContent(target.id) : Promise.resolve([]),
      isSelf
        ? getRecentActivity(target.id, target.previous_login_at)
        : Promise.resolve({ created: [], updated: [] }),
    ]);
  const needsPassword = isSelf && !hasPasswordSet;

  return (
    <>
      <PageMeta title={isSelf ? "Mein Profil" : target.name} section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>{isSelf ? `Willkommen, ${target.name}` : target.name}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            {isSelf ? "Angemeldet als " : "E-Mail "}
            <strong>{target.email}</strong> ({ROLE_LABELS[target.role]}).
          </p>

          {needsPassword && (
            <p className="text-lcars-amber">
              Du hast noch kein Passwort gesetzt.{" "}
              <Link
                href={`/users/${target.id}/settings#password`}
                className="underline"
              >
                Jetzt festlegen
              </Link>
              .
            </p>
          )}

          {isSelf && (
            <RecentActivity
              created={recentActivity.created}
              updated={recentActivity.updated}
              firstVisit={target.previous_login_at === null}
            />
          )}

          {isSelf && (
            <FollowedContentSection
              heading="Deine Lesezeichen"
              emptyLabel="Noch keine Lesezeichen gesetzt."
              items={bookmarks}
            />
          )}

          {isSelf && (
            <FollowedContentSection
              heading="Deine Abos"
              emptyLabel="Noch keine Abos abgeschlossen."
              items={subscriptions}
            />
          )}

          {!isSelf && (
            <p className="flex flex-wrap gap-[16px]">
              <Link href="/users" className="text-lcars-amber underline">
                ← Zur Nutzerverwaltung
              </Link>
              {viewer.role === "admin" && (
                <Link
                  href={`/users/${target.id}/edit`}
                  className="text-lcars-amber underline"
                >
                  User bearbeiten
                </Link>
              )}
            </p>
          )}
          <div className="max-w-[var(--lcars-content-w)]">
            {isSelf && <InstallPwaPrompt />}
          </div>
        </div>
      </article>
    </>
  );
}
