import Link from "next/link";
import { Suspense } from "react";
import PageMeta from "@/components/PageMeta";
import { LcarsSkeleton } from "@/components/lcars";
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

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};
type DashboardPrefs = ReturnType<typeof sanitizeDashboardPrefs>;
type CreationButtons = NonNullable<
  Parameters<typeof NewContentPanel>[0]["show"]
>;

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
  const brauchtFormularDaten =
    zeigtNeuesLog || zeigtNeuesGespraech || zeigtNeuesEvent;
  const anlegeKnoepfe = [
    ...(zeigtNeuesLog ? (["missionLog"] as const) : []),
    ...(zeigtNeuesGespraech ? (["dialogue"] as const) : []),
    ...(zeigtNeuesEvent ? (["event"] as const) : []),
    ...(zeigtNeuenEintrag ? (["archiveEntry"] as const) : []),
    ...(zeigtNeuenNpc ? (["npc"] as const) : []),
  ] as CreationButtons;

  return (
    <>
      <PageMeta title="Home" section="home" />
      <DashboardAutoRefresh />
      <article className="mb-[10px] lcars-wide-column">
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
            <PasswordNotice userId={user.id} />
          </Suspense>
          {user.previous_login_at === null && (
            <p className="lcars-text">
              Das ist dein erster Besuch — willkommen an Bord.{" "}
              <Link href="/willkommen" className="underline">
                Erste Schritte
              </Link>
              .
            </p>
          )}
          {zeigt("erste-schritte") && (
            <Suspense fallback={<DashboardSectionFallback />}>
              <OnboardingSection userId={user.id} />
            </Suspense>
          )}
          {zeigt("spielabende") && (
            <Suspense fallback={<DashboardSectionFallback rows={2} />}>
              <UpcomingSessionsData userId={user.id} />
            </Suspense>
          )}
          {zeigt("todos") && (
            <Suspense fallback={<DashboardSectionFallback />}>
              <PendingData userId={user.id} />
            </Suspense>
          )}
          {zeigt("gespraeche") && (
            <Suspense fallback={<DashboardSectionFallback />}>
              <DialoguesData userId={user.id} />
            </Suspense>
          )}
          <Suspense fallback={<DashboardSectionFallback rows={2} />}>
            <NewContentData
              user={user}
              needsData={brauchtFormularDaten}
              show={anlegeKnoepfe}
              canImport={zeigtImport}
            />
          </Suspense>
          {zeigt("entwuerfe") && (
            <Suspense fallback={<DashboardSectionFallback />}>
              <DraftsData userId={user.id} />
            </Suspense>
          )}
          {zeigtCharaktere && (
            <Suspense fallback={<DashboardSectionFallback rows={3} />}>
              <CharactersData userId={user.id} prefs={prefs} />
            </Suspense>
          )}
          {zeigt("versionen") && (
            <ChangelogSection roles={[user.role, ...user.additional_roles]} />
          )}
          {zeigt("news") && (
            <Suspense fallback={<DashboardSectionFallback rows={2} />}>
              <NewsData user={user} />
            </Suspense>
          )}
          {zeigt("lesezeichen") && (
            <Suspense fallback={<DashboardSectionFallback />}>
              <BookmarksData userId={user.id} />
            </Suspense>
          )}
        </div>
      </article>
    </>
  );
}

function DashboardSectionFallback({ rows = 1 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-[8px]" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <LcarsSkeleton
          key={i}
          className="h-[34px] w-full rounded-[var(--lcars-radius-pill)]"
        />
      ))}
    </div>
  );
}

async function PasswordNotice({ userId }: { userId: number }) {
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

async function UpcomingSessionsData({ userId }: { userId: number }) {
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

async function PendingData({ userId }: { userId: number }) {
  return <PendingActionsSection items={await getPendingActions(userId)} />;
}

async function DialoguesData({ userId }: { userId: number }) {
  return (
    <OpenDialoguesSection items={await getDialoguesForUser(userId, "open")} />
  );
}

async function NewContentData({
  user,
  needsData,
  show,
  canImport,
}: {
  user: User;
  needsData: boolean;
  show: CreationButtons;
  canImport: boolean;
}) {
  if (!needsData) {
    return (
      <NewContentPanel
        data={{
          userId: user.id,
          missionLog: null,
          dialogue: null,
          mission: null,
          event: null,
        }}
        show={show}
        canImport={canImport}
        title="Neues anlegen"
        storageId="dashboard:anlegen"
      />
    );
  }
  const needsCharacters =
    show.includes("missionLog") || show.includes("dialogue");
  const [characters, roleMap] = await Promise.all([
    needsCharacters ? getCharactersForUser(user.id) : Promise.resolve([]),
    getRoleMap(),
  ]);
  const data = await loadNewContentData(user, characters, roleMap, {
    missionLog: show.includes("missionLog"),
    dialogue: show.includes("dialogue"),
    event: show.includes("event"),
  });
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
async function DraftsData({ userId }: { userId: number }) {
  return (
    <DraftsSection
      drafts={await getOwnDrafts(userId)}
      storageId="dashboard:entwuerfe"
    />
  );
}

async function CharactersData({
  userId,
  prefs,
}: {
  userId: number;
  prefs: DashboardPrefs;
}) {
  const characters = await getCharactersForUser(userId);
  return (
    <DashboardCharactersSection
      characters={characters
        .filter((c) => dashboardCharacterVisible(prefs, c.id))
        .map(toDashboardCharacterItem)}
    />
  );
}

async function NewsData({ user }: { user: User }) {
  const permissions = await getCurrentUserPermissions();
  const items = await getNewsItems(
    user.id,
    user.news_kinds,
    newsVisibility(permissions),
  );
  return <NewsSection items={items} />;
}

async function BookmarksData({ userId }: { userId: number }) {
  return (
    <FollowedContentSection
      heading="Deine Lesezeichen"
      items={await getBookmarkedContent(userId)}
    />
  );
}
