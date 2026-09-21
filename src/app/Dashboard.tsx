import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { hasPassword } from "@/lib/users";
import { getBookmarkedContent } from "@/lib/follows";
import { getNewsItems } from "@/lib/recentActivity";
import { newsVisibility } from "@/lib/recentActivityFormat";
import { getCurrentUserPermissions } from "@/lib/dal";
import { getCharactersForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { getPendingActions } from "@/lib/pendingActions";
import { listUpcomingSessions } from "@/lib/plannedSessions";
import { getRoleMap } from "@/lib/roles";
import {
  dashboardCharacterVisible,
  dashboardSectionEnabled,
  sanitizeDashboardPrefs,
} from "@/lib/dashboardSections";
import { loadNewContentData } from "./user/content/newContentData";
import NewContentButtons from "./user/content/NewContentButtons";
import FollowedContentSection from "./FollowedContentSection";
import OpenDialoguesSection from "./OpenDialoguesSection";
import PendingActionsSection from "./PendingActionsSection";
import UpcomingSessionsSection from "./UpcomingSessionsSection";
import DashboardCharactersSection, {
  toDashboardCharacterItem,
} from "./DashboardCharactersSection";
import NewsSection from "./NewsSection";
import ChangelogSection from "./ChangelogSection";
import OnboardingSection from "./OnboardingSection";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import { DashboardGuide } from "@/components/help/guides/UserGuides";
import { SettingsIcon } from "@/lib/icons";
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
//
// Welche Sektionen erscheinen, entscheidet jede Person im Profil
// (users.dashboard_prefs, siehe src/lib/dashboardSections.ts). Das ist hier
// nicht nur eine Anzeige-Frage: Was niemand sieht, wird auch nicht geladen.
// Vorher holte diese Seite bei JEDEM Aufruf sechs Abfragen parallel, egal
// wie viel davon die Person überhaupt liest — und "/" ist die meistbesuchte
// Seite der Anwendung.
export default async function Dashboard({ user }: { user: User }) {
  const prefs = sanitizeDashboardPrefs(user.dashboard_prefs);
  const zeigt = (id: Parameters<typeof dashboardSectionEnabled>[1]) =>
    dashboardSectionEnabled(prefs, id);

  const zeigtCharaktere = zeigt("charaktere");
  const zeigtNeuesLog = zeigt("neues-log");
  const zeigtNeuesGespraech = zeigt("neues-gespraech");
  // Die Charakter-Liste brauchen zwei Dinge: die Sektion selbst und die
  // Anlege-Formulare (sie fragen, mit welcher Figur geschrieben wird).
  const brauchtCharaktere =
    zeigtCharaktere || zeigtNeuesLog || zeigtNeuesGespraech;

  // Effektive Rechte (aus allen Rollen + Overrides) — der News-Feed muss
  // dieselbe Sichtbarkeit wie canView im Rest der App anwenden, nicht die
  // Primärrolle. getCurrentUserPermissions ist React-cache-dedupliziert
  // (siehe dal.ts), der Aufruf ist damit praktisch gratis.
  const permissions = await getCurrentUserPermissions();

  // Voneinander unabhängig — parallel statt nacheinander abfragen, sonst
  // addieren sich die Roundtrips zur (entfernten) DB bei jeder Navigation
  // spürbar auf. News sind seit PR #51 persistent (nicht mehr "seit letztem
  // Besuch"), gefiltert nach den im Profil gewählten News-Arten
  // (user.news_kinds) und dem "gesehen"-Status (news_seen) — daher hier auch
  // kein touchDashboardVisit mehr, das die Grenze früher fortschrieb.
  const [
    hasPasswordSet,
    bookmarks,
    newsItems,
    openDialogues,
    pendingActions,
    upcomingSessions,
    characters,
    roleMap,
  ] = await Promise.all([
    hasPassword(user.id),
    zeigt("lesezeichen") ? getBookmarkedContent(user.id) : Promise.resolve([]),
    zeigt("news")
      ? getNewsItems(user.id, user.news_kinds, newsVisibility(permissions))
      : Promise.resolve([]),
    zeigt("gespraeche")
      ? getDialoguesForUser(user.id, "open")
      : Promise.resolve([]),
    zeigt("todos") ? getPendingActions(user.id) : Promise.resolve([]),
    zeigt("spielabende") ? listUpcomingSessions() : Promise.resolve([]),
    brauchtCharaktere ? getCharactersForUser(user.id) : Promise.resolve([]),
    zeigtNeuesLog || zeigtNeuesGespraech ? getRoleMap() : Promise.resolve({}),
  ]);

  // Die Auswahllisten der beiden Anlege-Formulare. Erst hier, weil sie die
  // Charakter-Liste von oben brauchen — und nur für die Knöpfe, die auch
  // eingeschaltet sind (siehe loadNewContentData).
  const newContent =
    zeigtNeuesLog || zeigtNeuesGespraech
      ? await loadNewContentData(user, characters, roleMap, {
          missionLog: zeigtNeuesLog,
          dialogue: zeigtNeuesGespraech,
        })
      : null;
  const anlegeKnoepfe = [
    ...(zeigtNeuesLog ? (["missionLog"] as const) : []),
    ...(zeigtNeuesGespraech ? (["dialogue"] as const) : []),
  ];
  // Ein Knopf, den es für dieses Konto nicht gibt (kein eigener
  // veröffentlichter Charakter), lässt die Überschrift sonst über einer
  // leeren Zeile stehen.
  const hatAnlegeKnopf =
    newContent !== null &&
    ((zeigtNeuesLog && newContent.missionLog !== null) ||
      (zeigtNeuesGespraech && newContent.dialogue !== null));

  const needsPassword = !hasPasswordSet;
  const firstVisit = user.previous_login_at === null;

  return (
    <>
      <PageMeta title="Home" section="home" />
      <article className="mb-[10px] lcars-wide-column">
        {/* Zwei Symbol-Knöpfe neben der Überschrift: das Fragezeichen erklärt
            diese Seite, das Zahnrad führt zu der Klappe im Profil, in der
            sich einstellen lässt, was hier überhaupt steht. */}
        <HelpTitleRow
          help={
            <div className="flex items-start gap-[8px]">
              <HelpButton title="Startseite" tutorial="mein-bereich">
                <DashboardGuide />
              </HelpButton>
              <Link
                href="/user#dashboard"
                className="lcars-icon-btn"
                aria-label="Startseite einrichten"
                title="Startseite einrichten"
              >
                <SettingsIcon />
              </Link>
            </div>
          }
        >
          <h1>Willkommen, {user.name}</h1>
        </HelpTitleRow>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Angemeldet als <strong>{user.email}</strong> (
            {ROLE_LABELS[user.role]}).
          </p>

          {needsPassword && (
            <p className="text-lcars-primary-ink">
              Du hast noch kein Passwort gesetzt.{" "}
              <Link href="/user#password" className="underline">
                Jetzt festlegen
              </Link>
              .
            </p>
          )}

          {firstVisit && (
            <p className="lcars-text">
              Das ist dein erster Besuch — willkommen an Bord.{" "}
              <Link href="/willkommen" className="underline">
                Erste Schritte
              </Link>
              .
            </p>
          )}

          {/* Verschwindet von selbst, sobald alle Schritte erledigt sind
              (siehe OnboardingSection). */}
          {zeigt("erste-schritte") && <OnboardingSection userId={user.id} />}

          {/* Der nächste Spielabend zuerst — er hat ein Datum, alles andere
              wartet. */}
          {zeigt("spielabende") && (
            <UpcomingSessionsSection
              sessions={upcomingSessions}
              userId={user.id}
              canRsvp={permissions.has("users.browse")}
            />
          )}

          {/* Was ICH noch zu tun habe — vor den Neuigkeiten, die zeigen,
              was andere getan haben. */}
          {zeigt("todos") && <PendingActionsSection items={pendingActions} />}

          {zeigt("gespraeche") && (
            <OpenDialoguesSection items={openDialogues} />
          )}

          {/* Die Anlege-Knöpfe: dieselben Formulare wie unter „Meine
              Inhalte", nur die hier eingeschalteten. Sie stehen zwischen dem,
              was ansteht, und dem, was andere getan haben — dort, wo man
              beim Lesen auf die Idee kommt, selbst etwas zu schreiben. */}
          {hatAnlegeKnopf && newContent && (
            <section className="flex flex-col gap-[12px]">
              <h2>Neues anlegen</h2>
              <NewContentButtons data={newContent} show={anlegeKnoepfe} />
            </section>
          )}

          {zeigtCharaktere && (
            <DashboardCharactersSection
              characters={characters
                .filter((c) => dashboardCharacterVisible(prefs, c.id))
                .map(toDashboardCharacterItem)}
            />
          )}

          {/* Welche Kategorien hier erscheinen, hängt an den Rollen dieser
              Person — die Administration blendet sie je Rolle aus (siehe
              ChangelogSection). Zusatzrollen zählen mit: wer auch
              Spielleitung ist, sieht deren Neuerungen. */}
          {zeigt("versionen") && (
            <ChangelogSection roles={[user.role, ...user.additional_roles]} />
          )}

          {zeigt("news") && <NewsSection items={newsItems} />}

          {zeigt("lesezeichen") && (
            <FollowedContentSection
              heading="Deine Lesezeichen"
              items={bookmarks}
            />
          )}
        </div>
      </article>
    </>
  );
}
