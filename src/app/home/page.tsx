import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageMeta from "@/components/PageMeta";
import { getSession } from "@/lib/session";
import { getUserById, hasPassword } from "@/lib/users";
import { getBookmarkedContent, getSubscribedContent } from "@/lib/follows";
import { getRecentActivity, getRecentDeletions } from "@/lib/recentActivity";
import { getDialoguesForUser } from "@/lib/dialogues";
import FollowedContentSection from "./FollowedContentSection";
import OpenDialoguesSection from "./OpenDialoguesSection";
import NewsSection from "./NewsSection";
import type { User } from "@/types/db";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

// Ersetzt den früheren blanken Redirect /home -> / (next.config.ts) — für
// eingeloggte User zeigt "Home" jetzt das persönliche Dashboard, das vorher
// auf /users/[id] (Profil) lag. Profil selbst ist jetzt mit Settings
// zusammengeführt (siehe users/[id]/page.tsx) und zeigt nur noch
// Konto-Verwaltung, keine Aktivitäts-Übersicht mehr. Anonyme Besucher landen
// weiterhin auf der Landingpage.
export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const user = await getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  // Voneinander unabhängig — parallel statt nacheinander abfragen, sonst
  // addieren sich die Roundtrips zur (entfernten) DB bei jeder Navigation
  // spürbar auf.
  const [hasPasswordSet, bookmarks, subscriptions, recentActivity, deletions, openDialogues] =
    await Promise.all([
      hasPassword(user.id),
      getBookmarkedContent(user.id),
      getSubscribedContent(user.id),
      getRecentActivity(user.id, user.previous_login_at),
      getRecentDeletions(user.id, user.previous_login_at),
      getDialoguesForUser(user.id, "open"),
    ]);
  const needsPassword = !hasPasswordSet;
  const firstVisit = user.previous_login_at === null;

  return (
    <>
      <PageMeta title="Home" section="home" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Willkommen, {user.name}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Angemeldet als <strong>{user.email}</strong> ({ROLE_LABELS[user.role]}).
          </p>

          {needsPassword && (
            <p className="text-lcars-amber">
              Du hast noch kein Passwort gesetzt.{" "}
              <Link href={`/users/${user.id}#password`} className="underline">
                Jetzt festlegen
              </Link>
              .
            </p>
          )}

          {firstVisit && (
            <p className="lcars-text">
              Das ist dein erster Besuch — willkommen an Bord.
            </p>
          )}

          <OpenDialoguesSection items={openDialogues} />

          <NewsSection
            created={recentActivity.created}
            updated={recentActivity.updated}
            deleted={deletions}
          />

          <FollowedContentSection heading="Deine Lesezeichen" items={bookmarks} />

          <FollowedContentSection heading="Deine Abos" items={subscriptions} />
        </div>
      </article>
    </>
  );
}
