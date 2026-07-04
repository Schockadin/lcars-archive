import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireSelfOrGM } from "./dal";
import { getCharactersForUser } from "@/lib/characters";
import { getRecentActivitySince } from "@/lib/timeline";
import { hasPassword } from "@/lib/users";
import { getBookmarkedContent, getSubscribedContent } from "@/lib/follows";
import { getDialoguesForUser } from "@/lib/dialogues";
import DashboardCharacters from "./DashboardCharacters";
import RecentActivity from "./RecentActivity";
import FollowedContentSection from "./FollowedContentSection";
import DialogueSection from "./DialogueSection";
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
  const [
    characters,
    recentEvents,
    hasPasswordSet,
    bookmarks,
    subscriptions,
    dialogues,
  ] = await Promise.all([
    getCharactersForUser(target.id),
    isSelf
      ? getRecentActivitySince(target.previous_login_at)
      : Promise.resolve([]),
    isSelf ? hasPassword(target.id) : Promise.resolve(true),
    isSelf ? getBookmarkedContent(target.id) : Promise.resolve([]),
    isSelf ? getSubscribedContent(target.id) : Promise.resolve([]),
    isSelf ? getDialoguesForUser(target.id) : Promise.resolve([]),
  ]);
  const needsPassword = isSelf && !hasPasswordSet;

  return (
    <>
      <PageMeta title={isSelf ? "Mein Profil" : target.name} section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <h1>{isSelf ? `Willkommen, ${target.name}` : target.name}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            {isSelf ? "Angemeldet als " : "E-Mail "}
            <strong>{target.email}</strong> ({ROLE_LABELS[target.role]}).
          </p>

          {isSelf && <InstallPwaPrompt />}

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

          <DashboardCharacters characters={characters} />

          {isSelf && (
            <RecentActivity
              events={recentEvents}
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

          {isSelf && (
            <DialogueSection
              dialogues={dialogues}
              canStartNew={characters.length > 0}
              userId={target.id}
            />
          )}

          {isSelf && characters.length > 0 && (
            <p>
              <Link
                href={`/users/${target.id}/mission-logs/new`}
                className="lcars-switch self-end"
              >
                Neuer Missionslog
              </Link>
            </p>
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
        </div>
      </article>
    </>
  );
}
