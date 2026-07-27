import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireOwnUser } from "./dal";
import { hasPassword, getEditorSpellcheckPreference } from "@/lib/users";
import { getCharactersForUser, getUsedCharacterColors } from "@/lib/characters";
import {
  resolveCharacterDefaultColor,
  normalizeHex,
} from "@/lib/characterColor";
import SettingsForm from "./SettingsForm";
import PasswordForm from "./PasswordForm";
import LogoutEverywhereButton from "./LogoutEverywhereButton";
import NotificationSettingsForm from "./NotificationSettingsForm";
import NewsSettingsForm from "./NewsSettingsForm";
import EditorSpellcheckSettingsForm from "./EditorSpellcheckSettingsForm";
import CharacterColorForm from "./CharacterColorForm";
import InstallPwaPrompt from "./InstallPwaPrompt";
import type { User } from "@/types/db";
import DataRow from "@/components/lcars/DataRow";

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
// der Session, kein :id-Segment in der URL) — das Ansehen FREMDER User
// (Übersicht + deren öffentliche Inhalte) lebt unter /users/[id] (Plural),
// nicht mehr hier.
export default async function UserPage() {
  const target = await requireOwnUser();
  const roleMap = await getRoleMap();

  const hasPasswordSet = await hasPassword(target.id);
  const needsPassword = !hasPasswordSet;
  const spellcheckEnabled = await getEditorSpellcheckPreference(target.id);

  // Charakter-Farben: eine Liste statt einer einzigen Wahl, seit die Farbe
  // pro Charakter statt pro User lebt (Multis sollen für jeden Charakter
  // eine eigene wählen können, siehe src/lib/characterColor.ts). takenColors
  // pro Charakter einzeln ermitteln (schließt jeweils nur den eigenen
  // Charakter aus, nicht die übrigen eigenen — der partielle UNIQUE-Index
  // macht jede Farbe global exklusiv, auch zwischen den eigenen Charakteren).
  const characters = await getCharactersForUser(target.id);
  const characterColors = await Promise.all(
    characters.map(async (c) => {
      const usedColors = await getUsedCharacterColors(c.id);
      const takenColors = usedColors.map(normalizeHex);
      const ownColor = resolveCharacterDefaultColor(
        c.character_color,
        c.id,
        new Set(takenColors),
      );
      return { character: c, ownColor, takenColors };
    }),
  );

  return (
    <>
      <PageMeta title="Profil" section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>Profil</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Angemeldet als <strong>{target.email}</strong> (
            {ROLE_LABELS[target.role]}).
          </p>

          {needsPassword && (
            <p className="text-lcars-amber">
              Du hast noch kein Passwort gesetzt.{" "}
              <Link href="#password" className="underline">
                Jetzt festlegen
              </Link>
              .
            </p>
          )}

          <div className="flex flex-col gap-[16px]">
            {characterColors.length > 0 && (
              <DataRow
                label="Charakterfarben"
                value={characterColors.length}
                accentColor="var(--lcars-text-data)"
                color="var(--lcars-amber)"
              >
                <section
                  id="character-colors"
                  className="flex flex-col gap-[24px]"
                >
                  <h2>Charakter-Farben</h2>
                  <p>
                    Jeder deiner Charaktere kann eine eigene Farbe haben — sie
                    färbt seine wörtliche Rede im Fließtext-Modus
                    abgeschlossener Gespräche sowie seine Nachrichten-Karten in
                    Gesprächen ein.
                  </p>
                  {characterColors.map(
                    ({ character, ownColor, takenColors }) => (
                      <div
                        key={character.id}
                        className="flex flex-col gap-[12px]"
                      >
                        <h3>
                          <Link href={`/characters/${character.slug}`}>
                            {character.name}
                          </Link>
                        </h3>
                        <CharacterColorForm
                          characterId={character.id}
                          ownColor={ownColor}
                          takenColors={takenColors}
                        />
                      </div>
                    ),
                  )}
                </section>
              </DataRow>
            )}

            <DataRow
              label="Settings"
              value={9}
              accentColor="var(--lcars-red)"
              color="var(--lcars-amber-light)"
            >
              <h2>User-Daten</h2>
              <SettingsForm user={{ name: target.name, email: target.email }} />

              <div className="horizontalBar" />

              <section id="password" className="flex flex-col gap-[12px]">
                <h2>
                  {hasPasswordSet ? "Passwort ändern" : "Passwort festlegen"}
                </h2>
                <PasswordForm hasPassword={hasPasswordSet} />
              </section>

              <div className="horizontalBar" />

              <section id="follows" className="flex flex-col gap-[8px]">
                <h2>Follows</h2>
                <p>
                  Alle Missionen, Archiv-Einträge und Charaktere, die du
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

              <section id="tutorial" className="flex flex-col gap-[8px]">
                <h2>Hilfe & Anleitung</h2>
                <p>
                  Unsicher, wie etwas funktioniert? Das Tutorial erklärt alle
                  Funktionen des Archivs — von der Suche bis zur
                  Markdown-Formatierung.
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

              <section id="notifications" className="flex flex-col gap-[12px]">
                <h2>Benachrichtigungen</h2>
                <NotificationSettingsForm
                  user={{
                    emailEnabled: target.email_notifications_enabled,
                    pushEnabled: target.push_notifications_enabled,
                    notifyContentTypes: target.notify_content_types,
                  }}
                  isAdmin={userCan(target, "admin.access", roleMap)}
                />
              </section>

              <div className="horizontalBar" />

              <section id="news" className="flex flex-col gap-[12px]">
                <h2>News</h2>
                <NewsSettingsForm newsKinds={target.news_kinds} />
              </section>

              <div className="horizontalBar" />

              <section id="editor" className="flex flex-col gap-[12px]">
                <h2>Editor</h2>
                <EditorSpellcheckSettingsForm enabled={spellcheckEnabled} />
              </section>

              <div className="horizontalBar" />

              <section id="install" className="flex flex-col gap-[12px]">
                <h2>App installieren</h2>
                <InstallPwaPrompt />
              </section>
            </DataRow>
          </div>
        </div>
      </article>
    </>
  );
}
