import type { Metadata } from "next";
import { Suspense } from "react";
import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "./dal";
import { hasPassword, getEditorSpellcheckPreference } from "@/lib/users";
import {
  COLOR_THEMES,
  normalizeThemeId,
  sanitizeThemeOverrides,
} from "@/lib/themes";
import {
  getCharactersForUser,
  getUsedCharacterColorsWithIds,
} from "@/lib/characters";
import {
  resolveCharacterDefaultColor,
  takenColorsForCharacter,
} from "@/lib/characterColor";
import DashboardSettingsForm from "./DashboardSettingsForm";
import SettingsForm from "./SettingsForm";
import PasswordForm from "./PasswordForm";
import LogoutEverywhereButton from "./LogoutEverywhereButton";
import NotificationSettingsForm from "./NotificationSettingsForm";
import NewsSettingsForm from "./NewsSettingsForm";
import EditorSpellcheckSettingsForm from "./EditorSpellcheckSettingsForm";
import CharacterColorForm from "./CharacterColorForm";
import ThemeSettingsForm from "./ThemeSettingsForm";
import UiModeSettingsForm from "./UiModeSettingsForm";
import FontSettingsForm from "./FontSettingsForm";
import ColorModeSettingsForm from "./ColorModeSettingsForm";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import {
  DASHBOARD_SECTIONS,
  dashboardSectionEnabled,
  sanitizeDashboardPrefs,
} from "@/lib/dashboardSections";
import { isMinimalUiMode, normalizeUiMode } from "@/lib/uiMode";
import { COLOR_MODE_LIGHT, normalizeColorMode } from "@/lib/colorMode";
import {
  fontSansLabel,
  fontMonoLabel,
  normalizeFontSans,
  normalizeFontMono,
} from "@/lib/fonts";
import InstallPwaPrompt from "./InstallPwaPrompt";
import type { User } from "@/types/db";
import { LcarsCollapsiblePanel } from "@/components/lcars";
import { characterHref } from "@/lib/contentRoutes";
import HelpHeading from "@/components/help/HelpHeading";
import { UserProfileGuide } from "@/components/help/guides/UserGuides";
import { LcarsSkeleton } from "@/components/lcars";

export const metadata: Metadata = {
  title: "Profil",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<User["role"], string> = {
  admin: "Administration",
  gm: "Spielleitung",
  player: "Spieler",
  viewer: "Beobachter",
  guest: "Gast",
};

// Profil und Settings sind zusammengeführt: die Aktivitäts-Übersicht
// (Neu/News/offene Gespräche/Lesezeichen) lebt jetzt auf "/" (siehe
// src/app/Dashboard.tsx, gerendert von src/app/page.tsx für eingeloggte
// User) — hier bleibt nur noch die Konto-Verwaltung (Name/E-Mail, Passwort,
// Benachrichtigungen, PWA-Installation) plus die Follow-Verwaltung (Abos,
// siehe /user/follow). Reine Selbstbedienung (requireOwnUser, ID kommt aus
// der Session, kein :id-Segment in der URL). Eine öffentliche Übersicht
// FREMDER User gibt es nicht mehr — die frühere /users-Route wurde restlos
// entfernt.
export default async function UserPage() {
  const target = await requireOwnUser();

  const colorTheme = normalizeThemeId(target.color_theme);
  const themeOverrides = sanitizeThemeOverrides(target.theme_overrides);
  const uiMode = normalizeUiMode(target.ui_mode);
  const colorMode = normalizeColorMode(target.color_mode);
  const fontSans = normalizeFontSans(target.font_sans);
  const fontMono = normalizeFontMono(target.font_mono);
  const dashboardPrefs = sanitizeDashboardPrefs(target.dashboard_prefs);
  const aktiveSektionen = DASHBOARD_SECTIONS.filter((section) =>
    dashboardSectionEnabled(dashboardPrefs, section.id),
  ).length;

  return (
    <>
      <PageMeta title="Profil" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <HelpHeading
          title="Profil"
          helpTitle="Profil & Einstellungen"
          tutorial="mein-bereich"
        >
          <UserProfileGuide />
        </HelpHeading>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Angemeldet als <strong>{target.email}</strong> (
            {ROLE_LABELS[target.role]}).
          </p>

          <Suspense fallback={null}>
            <ProfilePasswordNotice userId={target.id} />
          </Suspense>

          <div className="flex flex-col gap-[16px]">
            {/* Ganz oben und mit eigener Anker-id: Das Zahnrad neben der
                Überschrift des Dashboards führt direkt hierher
                (/user#dashboard). Der Anker klappt den Abschnitt dabei auf,
                auch wenn er zuletzt zugeklappt verlassen wurde — siehe
                CollapsiblePanel. */}
            <LcarsCollapsiblePanel
              title="Startseite"
              htmlId="dashboard"
              badge={`${aktiveSektionen} von ${DASHBOARD_SECTIONS.length}`}
              storageId="user:startseite"
              defaultOpen={false}
            >
              <Suspense fallback={<ProfilePanelFallback />}>
                <DashboardPreferences
                  userId={target.id}
                  prefs={dashboardPrefs}
                />
              </Suspense>
            </LcarsCollapsiblePanel>

            <Suspense fallback={<ProfilePanelFallback />}>
              <CharacterColorsPanel userId={target.id} />
            </Suspense>

            <LcarsCollapsiblePanel
              title="Darstellung"
              badge={`${COLOR_THEMES.length} Schemata`}
              storageId="user:darstellung"
              defaultOpen={false}
            >
              {/* Alle Darstellungs-Einstellungen als aufklappbare Panels
                  (SettingsPanel): Farben, Hell/Dunkel und Oberfläche stehen
                  sonst als eine sehr lange Liste untereinander. Jedes Panel
                  bleibt ein eigenes Formular mit eigenem „Speichern". */}
              <section id="theme" className="flex flex-col gap-[12px]">
                <p>
                  Färbe die Oberfläche nach deinem Geschmack: Basis-Schema,
                  Hintergrund, Schriftfarben und Akzente lassen sich einzeln
                  einstellen. Alle Angaben gelten nur für dich und bleiben bei
                  jedem Login erhalten.
                </p>

                <ThemeSettingsForm
                  currentTheme={colorTheme}
                  currentOverrides={themeOverrides}
                  currentMode={colorMode}
                />

                <SettingsPanel
                  title="Hell/Dunkel"
                  hint="Helles oder dunkles Erscheinungsbild — unabhängig vom Interface"
                  badge={colorMode === COLOR_MODE_LIGHT ? "Hell" : "Dunkel"}
                >
                  <ColorModeSettingsForm currentMode={colorMode} />
                </SettingsPanel>

                <SettingsPanel
                  title="Schriften"
                  hint="Beschriftungs- und Datenschrift getrennt wählbar"
                  badge={`${fontSansLabel(fontSans)} · ${fontMonoLabel(fontMono)}`}
                >
                  <FontSettingsForm
                    currentSans={fontSans}
                    currentMono={fontMono}
                  />
                </SettingsPanel>

                <SettingsPanel
                  title="Oberfläche"
                  hint="Volles LCARS-Design oder schlankes, minimalistisches Interface"
                  badge={isMinimalUiMode(uiMode) ? "Minimalistisch" : "LCARS"}
                >
                  <UiModeSettingsForm currentMode={uiMode} />
                </SettingsPanel>
              </section>
            </LcarsCollapsiblePanel>

            {/* Was dich erreicht und wem du folgst — drei Dinge, die
                zusammengehören und vorher verstreut in „Settings" standen,
                zwischen Passwort und Editor-Rechtschreibung. */}
            <LcarsCollapsiblePanel
              title="Follows & Benachrichtigungen"
              storageId="user:benachrichtigungen"
              defaultOpen={false}
            >
              <section id="follows" className="flex flex-col gap-[8px]">
                <h2>Follows</h2>
                <p>
                  Alle Missionen, Datenbank-Einträge und Charaktere, die du
                  abonniert hast, an einem Ort — inklusive der Möglichkeit,
                  einzelne Follows wieder zu beenden.
                </p>
                <Link
                  href="/user/follow"
                  className="lcars-pill-btn--outline self-start max-sm:w-full max-sm:self-stretch"
                >
                  Follows verwalten
                </Link>
              </section>

              <div className="horizontalBar" />

              <section id="notifications" className="flex flex-col gap-[12px]">
                <h2>Benachrichtigungen</h2>
                <Suspense fallback={<ProfilePanelFallback rows={2} />}>
                  <NotificationPreferences target={target} />
                </Suspense>
              </section>

              <div className="horizontalBar" />

              <section id="news" className="flex flex-col gap-[12px]">
                <h2>News</h2>
                <NewsSettingsForm newsKinds={target.news_kinds} />
              </section>
            </LcarsCollapsiblePanel>

            <LcarsCollapsiblePanel
              title="Settings"
              storageId="user:settings"
              defaultOpen={false}
            >
              <h2>User-Daten</h2>
              <SettingsForm user={{ name: target.name, email: target.email }} />

              <div className="horizontalBar" />

              <Suspense fallback={<ProfilePanelFallback rows={2} />}>
                <PasswordSettings userId={target.id} />
              </Suspense>

              <div className="horizontalBar" />

              <section id="tutorial" className="flex flex-col gap-[8px]">
                <h2>Hilfe & Anleitung</h2>
                <p>
                  Unsicher, wie etwas funktioniert? Das{" "}
                  <strong>Fragezeichen im Menü</strong> öffnet die Anleitung —
                  sie erklärt alle Funktionen der Datenbank, von der Suche bis
                  zur Markdown-Formatierung. Dasselbe Zeichen steht oben rechts
                  auf jeder Seite und erklärt dort genau diesen einen Bereich,
                  ohne dass du die Seite verlässt.
                </p>
                <Link
                  href="/tutorial"
                  className="lcars-pill-btn--outline self-start max-sm:w-full max-sm:self-stretch"
                >
                  Tutorial öffnen
                </Link>
              </section>

              <div className="horizontalBar" />

              <section id="sessions" className="flex flex-col gap-[12px]">
                <h2>Sitzungen</h2>
                <p>
                  Vermutest du, dass noch ein fremdes Gerät angemeldet ist? Hier
                  kannst du alle anderen Sitzungen beenden, ohne dein Passwort
                  zu ändern.
                </p>
                <LogoutEverywhereButton />
              </section>

              <div className="horizontalBar" />

              <section id="editor" className="flex flex-col gap-[12px]">
                <h2>Editor</h2>
                <Suspense fallback={<ProfilePanelFallback rows={2} />}>
                  <SpellcheckSettings userId={target.id} />
                </Suspense>
              </section>

              <div className="horizontalBar" />

              <section id="install" className="flex flex-col gap-[12px]">
                <h2>App installieren</h2>
                <InstallPwaPrompt />
              </section>
            </LcarsCollapsiblePanel>
          </div>
        </div>
      </article>
    </>
  );
}

function ProfilePanelFallback({ rows = 1 }: { rows?: number }) {
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
async function DashboardPreferences({
  userId,
  prefs,
}: {
  userId: number;
  prefs: ReturnType<typeof sanitizeDashboardPrefs>;
}) {
  const characters = await getCharactersForUser(userId);
  return (
    <section className="flex flex-col gap-[12px]">
      <h2>Was auf der Startseite steht</h2>
      <DashboardSettingsForm
        prefs={prefs}
        characters={characters.map((c) => ({ id: c.id, name: c.name }))}
      />
    </section>
  );
}
async function CharacterColorsPanel({ userId }: { userId: number }) {
  const [characters, usedColors] = await Promise.all([
    getCharactersForUser(userId),
    getUsedCharacterColorsWithIds(),
  ]);
  const characterColors = characters.map((character) => {
    const takenColors = takenColorsForCharacter(character.id, usedColors);
    const ownColor = resolveCharacterDefaultColor(
      character.character_color,
      character.id,
      new Set(takenColors),
    );
    return { character, ownColor, takenColors };
  });
  if (!characterColors.length) return null;
  return (
    <LcarsCollapsiblePanel
      title="Charakterfarben"
      badge={characterColors.length}
      storageId="user:charakterfarben"
      defaultOpen={false}
    >
      <section id="character-colors" className="flex flex-col gap-[24px]">
        <h2>Charakter-Farben</h2>
        <p>
          Jeder deiner Charaktere kann eine eigene Farbe haben — sie färbt seine
          wörtliche Rede im Fließtext-Modus abgeschlossener Gespräche sowie
          seine Nachrichten-Karten in Gesprächen ein.
        </p>
        {characterColors.map(({ character, ownColor, takenColors }) => (
          <div key={character.id} className="flex flex-col gap-[12px]">
            <h3>
              <Link href={characterHref(character.slug)}>{character.name}</Link>
            </h3>
            <CharacterColorForm
              characterId={character.id}
              ownColor={ownColor}
              takenColors={takenColors}
            />
          </div>
        ))}
      </section>
    </LcarsCollapsiblePanel>
  );
}
async function NotificationPreferences({ target }: { target: User }) {
  const roleMap = await getRoleMap();
  return (
    <NotificationSettingsForm
      user={{
        emailEnabled: target.email_notifications_enabled,
        pushEnabled: target.push_notifications_enabled,
        notifyContentTypes: target.notify_content_types,
      }}
      isAdmin={userCan(target, "admin.access", roleMap)}
    />
  );
}
async function PasswordSettings({ userId }: { userId: number }) {
  const hasPasswordSet = await hasPassword(userId);
  return (
    <section id="password" className="flex flex-col gap-[12px]">
      <h2>{hasPasswordSet ? "Passwort ändern" : "Passwort festlegen"}</h2>
      <PasswordForm hasPassword={hasPasswordSet} />
    </section>
  );
}
async function SpellcheckSettings({ userId }: { userId: number }) {
  const enabled = await getEditorSpellcheckPreference(userId);
  return <EditorSpellcheckSettingsForm enabled={enabled} />;
}

async function ProfilePasswordNotice({ userId }: { userId: number }) {
  if (await hasPassword(userId)) return null;
  return (
    <p className="text-lcars-primary-ink">
      Du hast noch kein Passwort gesetzt.{" "}
      <Link href="#password" className="underline">
        Jetzt festlegen
      </Link>
      .
    </p>
  );
}
