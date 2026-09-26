import { Suspense, cache } from "react";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { hasPassword } from "@/lib/users";
import { getBookmarkedContent } from "@/lib/follows";
import { getNewsItems } from "@/lib/recentActivity";
import { newsVisibility } from "@/lib/recentActivityFormat";
import { getCurrentUserPermissions } from "@/lib/dal";
import { getCharactersForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import { getOwnDrafts } from "@/lib/drafts";
import { getPendingActions } from "@/lib/pendingActions";
import { listUpcomingSessions } from "@/lib/plannedSessions";
import { getRoleMap } from "@/lib/roles";
import {
  dashboardCharacterVisible,
  dashboardSectionEnabled,
  sanitizeDashboardPrefs,
} from "@/lib/dashboardSections";
import { loadNewContentData } from "./user/content/newContentData";
import NewContentPanel from "./user/content/NewContentPanel";
import FollowedContentSection from "./FollowedContentSection";
import OpenDialoguesSection from "./OpenDialoguesSection";
import PendingActionsSection from "./PendingActionsSection";
import UpcomingSessionsSection from "./UpcomingSessionsSection";
import DashboardCharactersSection, {
  toDashboardCharacterItem,
} from "./DashboardCharactersSection";
import DraftsSection from "./DraftsSection";
import DashboardAutoRefresh from "./DashboardAutoRefresh";
import NewsSection from "./NewsSection";
import ChangelogSection from "./ChangelogSection";
import OnboardingSection from "./OnboardingSection";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import { DashboardGuide } from "@/components/help/guides/UserGuides";
import { ProfileNavIcon } from "@/lib/icons";
import type { User } from "@/types/db";
import type { ComponentProps } from "react";

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
//
// Jede Sektion lädt ihre Daten selbst, in ihrer eigenen Suspense-Grenze
// (die *Block-Komponenten unten). Früher wartete die Seite auf ALLE
// Abfragen gemeinsam (und danach noch auf die Auswahllisten der
// Anlege-Formulare), bevor irgendetwas erschien — die langsamste Abfrage
// bestimmte die Ladezeit der ganzen Startseite. Besonders spürbar nach dem
// Kaltstart einer Server-Instanz, wenn jede Abfrage zuerst ihre
// DB-Verbindung aufbauen muss. Jetzt stehen Überschrift und Kopfzeile sofort,
// und jede Sektion erscheint, sobald ihre eigenen Daten da sind.
//
// fallback={null} statt Skeletten: Die meisten Sektionen verschwinden ganz,
// wenn sie nichts zu zeigen haben (leere Liste ⇒ null) — ein Skelett, das
// danach ersatzlos wegfällt, würde die Seite stärker springen lassen als
// eine Sektion, die einfach dazukommt. Die Reihenfolge im Markup bleibt
// dabei erhalten. Die Zehn-Sekunden-Aktualisierung (DashboardAutoRefresh)
// zeigt die Fallbacks nicht erneut: router.refresh() tauscht bereits
// sichtbare Inhalte erst aus, wenn die neuen fertig sind.
export default function Dashboard({ user }: { user: User }) {
  const prefs = sanitizeDashboardPrefs(user.dashboard_prefs);
  const zeigt = (id: Parameters<typeof dashboardSectionEnabled>[1]) =>
    dashboardSectionEnabled(prefs, id);

  const zeigtCharaktere = zeigt("charaktere");
  const zeigtNeuesLog = zeigt("neues-log");
  const zeigtNeuesGespraech = zeigt("neues-gespraech");
  const zeigtNeuesEvent = zeigt("neues-event");
  const zeigtNeuenEintrag = zeigt("neuer-eintrag");
  const zeigtNeuenNpc = zeigt("neuer-npc");
  const zeigtImport = zeigt("import");
  const anlegeKnoepfe = [
    ...(zeigtNeuesLog ? (["missionLog"] as const) : []),
    ...(zeigtNeuesGespraech ? (["dialogue"] as const) : []),
    ...(zeigtNeuesEvent ? (["event"] as const) : []),
    ...(zeigtNeuenEintrag ? (["archiveEntry"] as const) : []),
    ...(zeigtNeuenNpc ? (["npc"] as const) : []),
  ];
  // Der Import-Knopf führt nach /user/import. Dort gilt je Inhaltsart
  // dieselbe Schranke wie beim normalen Anlegen (src/lib/importAccess.ts) —
  // eine davon (der Datenbank-Eintrag) trägt für jede eingeloggte Person,
  // der Knopf führt also nie ins Leere. Ob er dasteht, entscheidet damit
  // allein die Sektion im Profil.

  const firstVisit = user.previous_login_at === null;

  return (
    <>
      <PageMeta title="Home" section="home" />
      {/* Hält die Seite im Zehn-Sekunden-Takt aktuell (siehe
          DashboardAutoRefresh) — sie zeigt lauter Dinge, die sich woanders
          ändern. Rendert nichts. */}
      <DashboardAutoRefresh />
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
              {/* Dasselbe Symbol, mit dem das minimalistische Interface auf
                  dem Telefon zum Profil führt (ProfileNavIcon, siehe
                  HeaderUserNav) — dieser Knopf führt an dieselbe Stelle, nur
                  direkt zu der Klappe darin. Zwei verschiedene Zeichen für
                  einen Weg wären eines zu viel. */}
              <Link
                href="/user#dashboard"
                className="lcars-icon-btn"
                aria-label="Startseite einrichten"
                title="Startseite einrichten"
              >
                <ProfileNavIcon />
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

          <Suspense fallback={null}>
            <PasswordHint userId={user.id} />
          </Suspense>

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
          {zeigt("erste-schritte") && (
            <Suspense fallback={null}>
              <OnboardingSection userId={user.id} />
            </Suspense>
          )}

          {/* Der nächste Spielabend zuerst — er hat ein Datum, alles andere
              wartet. */}
          {zeigt("spielabende") && (
            <Suspense fallback={null}>
              <UpcomingSessionsBlock userId={user.id} />
            </Suspense>
          )}

          {/* Was ICH noch zu tun habe — vor den Neuigkeiten, die zeigen,
              was andere getan haben. */}
          {zeigt("todos") && (
            <Suspense fallback={null}>
              <PendingActionsBlock userId={user.id} />
            </Suspense>
          )}

          {zeigt("gespraeche") && (
            <Suspense fallback={null}>
              <OpenDialoguesBlock userId={user.id} />
            </Suspense>
          )}

          {/* Die Anlege-Knöpfe: dieselben Formulare wie unter „Meine
              Inhalte", nur die hier eingeschalteten. Sie stehen zwischen dem,
              was ansteht, und dem, was andere getan haben — dort, wo man
              beim Lesen auf die Idee kommt, selbst etwas zu schreiben.
              Als Klappe wie die übrigen Abschnitte, damit die Seite eine
              Gestalt hat und nicht eine Überschrift zwischen lauter
              Kopfzeilen. */}
          <Suspense fallback={null}>
            <NewContentBlock
              user={user}
              show={anlegeKnoepfe}
              canImport={zeigtImport}
              wanted={{
                missionLog: zeigtNeuesLog,
                dialogue: zeigtNeuesGespraech,
                event: zeigtNeuesEvent,
              }}
            />
          </Suspense>

          {/* Ein Entwurf ist für niemanden außer seinem Besitzer sichtbar —
              ohne eine Stelle, die ihn nennt, bleibt er leicht liegen. */}
          {zeigt("entwuerfe") && (
            <Suspense fallback={null}>
              <DraftsBlock userId={user.id} />
            </Suspense>
          )}

          {zeigtCharaktere && (
            <Suspense fallback={null}>
              <CharactersBlock userId={user.id} prefs={prefs} />
            </Suspense>
          )}

          {/* Welche Kategorien hier erscheinen, hängt an den Rollen dieser
              Person — die Administration blendet sie je Rolle aus (siehe
              ChangelogSection). Zusatzrollen zählen mit: wer auch
              Spielleitung ist, sieht deren Neuerungen. */}
          {zeigt("versionen") && (
            <Suspense fallback={null}>
              <ChangelogSection
                roles={[user.role, ...user.additional_roles]}
              />
            </Suspense>
          )}

          {zeigt("news") && (
            <Suspense fallback={null}>
              <NewsBlock user={user} />
            </Suspense>
          )}

          {zeigt("lesezeichen") && (
            <Suspense fallback={null}>
              <BookmarksBlock userId={user.id} />
            </Suspense>
          )}
        </div>
      </article>
    </>
  );
}

// ── Die einzelnen Sektionen ────────────────────────────────────────────────
// Jede lädt ihre eigenen Daten und steht in ihrer eigenen Suspense-Grenze
// (siehe Dashboard oben). React-cache/„use cache" in den Datenfunktionen
// sorgen dafür, dass Gemeinsames (Rechte, Rollen-Map, eigene Charaktere)
// trotzdem nur einmal pro Anfrage abgefragt wird.

// Charakter-Sektion und Anlege-Formulare brauchen beide die eigenen
// Charaktere — pro Anfrage nur einmal laden.
const loadOwnCharacters = cache(getCharactersForUser);

async function PasswordHint({ userId }: { userId: number }) {
  if (await hasPassword(userId)) return null;
  return (
    <p className="text-lcars-primary-ink">
      Du hast noch kein Passwort gesetzt.{" "}
      <Link href="/user#password" className="underline">
        Jetzt festlegen
      </Link>
      .
    </p>
  );
}

async function UpcomingSessionsBlock({ userId }: { userId: number }) {
  const [sessions, permissions] = await Promise.all([
    listUpcomingSessions(),
    getCurrentUserPermissions(),
  ]);
  return (
    <UpcomingSessionsSection
      sessions={sessions}
      userId={userId}
      canRsvp={permissions.has("users.browse")}
    />
  );
}

async function PendingActionsBlock({ userId }: { userId: number }) {
  return <PendingActionsSection items={await getPendingActions(userId)} />;
}

async function OpenDialoguesBlock({ userId }: { userId: number }) {
  return (
    <OpenDialoguesSection items={await getDialoguesForUser(userId, "open")} />
  );
}

// Die Auswahllisten der Anlege-Formulare — nur für die Knöpfe, die sie
// überhaupt benötigen (siehe loadNewContentData). Eintrag und NPC kommen mit
// dem leeren Gerüst aus: Sie brauchen nur die eigene User-id. Wer nur diese
// beiden Knöpfe zeigt, löst damit keine einzige Abfrage aus.
async function NewContentBlock({
  user,
  show,
  canImport,
  wanted,
}: {
  user: User;
  show: ComponentProps<typeof NewContentPanel>["show"];
  canImport: boolean;
  wanted: { missionLog: boolean; dialogue: boolean; event: boolean };
}) {
  // Logbuch und Gespräch fragen, mit welcher eigenen Figur geschrieben wird;
  // das Event-Formular kommt ohne die eigene Charakterliste aus.
  const brauchtEigeneCharaktere = wanted.missionLog || wanted.dialogue;
  const brauchtFormularDaten = brauchtEigeneCharaktere || wanted.event;
  const data = brauchtFormularDaten
    ? await loadNewContentData(
        user,
        ...(await Promise.all([
          brauchtEigeneCharaktere
            ? loadOwnCharacters(user.id)
            : Promise.resolve([]),
          getRoleMap(),
        ])),
        wanted,
      )
    : {
        userId: user.id,
        missionLog: null,
        dialogue: null,
        mission: null,
        event: null,
      };
  return (
    <NewContentPanel
      data={data}
      show={show}
      canImport={canImport}
      title="Neues anlegen"
      storageId="dashboard:anlegen"
    />
  );
}

async function DraftsBlock({ userId }: { userId: number }) {
  return (
    <DraftsSection
      drafts={await getOwnDrafts(userId)}
      storageId="dashboard:entwuerfe"
    />
  );
}

async function CharactersBlock({
  userId,
  prefs,
}: {
  userId: number;
  prefs: ReturnType<typeof sanitizeDashboardPrefs>;
}) {
  const characters = await loadOwnCharacters(userId);
  return (
    <DashboardCharactersSection
      characters={characters
        .filter((c) => dashboardCharacterVisible(prefs, c.id))
        .map(toDashboardCharacterItem)}
    />
  );
}

// News sind seit PR #51 persistent (nicht mehr "seit letztem Besuch"),
// gefiltert nach den im Profil gewählten News-Arten (user.news_kinds) und dem
// "gesehen"-Status (news_seen). Die effektiven Rechte (aus allen Rollen +
// Overrides) legen dieselbe Sichtbarkeit an wie canView im Rest der App, nicht
// die Primärrolle.
async function NewsBlock({ user }: { user: User }) {
  const permissions = await getCurrentUserPermissions();
  const items = await getNewsItems(
    user.id,
    user.news_kinds,
    newsVisibility(permissions),
  );
  return <NewsSection items={items} />;
}

async function BookmarksBlock({ userId }: { userId: number }) {
  return (
    <FollowedContentSection
      heading="Deine Lesezeichen"
      items={await getBookmarkedContent(userId)}
    />
  );
}
