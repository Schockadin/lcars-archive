import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { hasPassword } from "@/lib/users";
import { getBookmarkedContent } from "@/lib/follows";
import { getNewsItems } from "@/lib/recentActivity";
import { newsVisibility } from "@/lib/recentActivityFormat";
import { getCurrentUserPermissions } from "@/lib/dal";
import { getDialoguesForUser } from "@/lib/dialogues";
import FollowedContentSection from "./FollowedContentSection";
import OpenDialoguesSection from "./OpenDialoguesSection";
import NewsSection from "./NewsSection";
import type { User } from "@/types/db";

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

// Persönliches Dashboard für eingeloggte User auf "/" (siehe page.tsx) —
// vorher auf /home, das jetzt wieder ein blanker Redirect auf "/" ist
// (next.config.ts), und davor auf /user/[id] (Profil), das inzwischen mit
// Settings zusammengeführt ist und nur noch Konto-Verwaltung zeigt.
export default async function Dashboard({ user }: { user: User }) {
  // Voneinander unabhängig — parallel statt nacheinander abfragen, sonst
  // addieren sich die Roundtrips zur (entfernten) DB bei jeder Navigation
  // spürbar auf. News sind seit PR #51 persistent (nicht mehr "seit letztem
  // Besuch"), gefiltert nach den im Profil gewählten News-Arten
  // (user.news_kinds) und dem "gesehen"-Status (news_seen) — daher hier auch
  // kein touchDashboardVisit mehr, das die Grenze früher fortschrieb.
  // Effektive Rechte (aus allen Rollen + Overrides) — der News-Feed muss
  // dieselbe Sichtbarkeit wie canView im Rest der App anwenden, nicht die
  // Primärrolle. getCurrentUserPermissions ist React-cache-dedupliziert
  // (siehe dal.ts), der Aufruf ist damit praktisch gratis.
  const permissions = await getCurrentUserPermissions();
  const [hasPasswordSet, bookmarks, newsItems, openDialogues] =
    await Promise.all([
      hasPassword(user.id),
      getBookmarkedContent(user.id),
      getNewsItems(user.id, user.news_kinds, newsVisibility(permissions)),
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
            Angemeldet als <strong>{user.email}</strong> (
            {ROLE_LABELS[user.role]}).
          </p>

          {needsPassword && (
            <p className="text-lcars-primary">
              Du hast noch kein Passwort gesetzt.{" "}
              <Link href="/user#password" className="underline">
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

          <NewsSection items={newsItems} />

          <FollowedContentSection
            heading="Deine Lesezeichen"
            items={bookmarks}
          />
        </div>
      </article>
    </>
  );
}
