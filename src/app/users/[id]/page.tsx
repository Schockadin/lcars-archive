import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireSelfOrGM } from "./dal";
import { hasPassword } from "@/lib/users";
import SettingsForm from "./SettingsForm";
import PasswordForm from "./PasswordForm";
import NotificationSettingsForm from "./NotificationSettingsForm";
import InstallPwaPrompt from "./InstallPwaPrompt";
import type { User } from "@/types/db";

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
// (Neu/News/offene Gespräche/Lesezeichen/Abos) lebt jetzt auf "/" (siehe
// src/app/Dashboard.tsx, gerendert von src/app/page.tsx für eingeloggte
// User) — hier bleibt nur noch die Konto-Verwaltung (Name/E-Mail, Passwort,
// Benachrichtigungen, PWA-Installation), plus weiterhin die Admin/GM-Ansicht
// eines FREMDEN Users (isSelf === false, z.B. aus der Nutzerverwaltung).
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { viewer, target, isSelf } = await requireSelfOrGM(id);

  const hasPasswordSet = isSelf ? await hasPassword(target.id) : true;
  const needsPassword = isSelf && !hasPasswordSet;

  return (
    <>
      <PageMeta title={isSelf ? "Profil" : target.name} section="users" />
      <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
        <h1>{isSelf ? "Profil" : target.name}</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            {isSelf ? "Angemeldet als " : "E-Mail "}
            <strong>{target.email}</strong> ({ROLE_LABELS[target.role]}).
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

          {isSelf && (
            <div className="flex flex-col gap-[32px]">
              <section id="tutorial" className="flex flex-col gap-[8px]">
                <h2>Hilfe & Anleitung</h2>
                <p>
                  Unsicher, wie etwas funktioniert? Das Tutorial erklärt alle
                  Funktionen des Archivs — von der Suche bis zur
                  Markdown-Formatierung.
                </p>
                <Link
                  href="/tutorial"
                  className="lcars-pill-btn--outline self-start"
                >
                  Tutorial öffnen
                </Link>
              </section>

              <section id="follows" className="flex flex-col gap-[8px]">
                <h2>Follows</h2>
                <p>
                  Alle Missionen, Archiv-Einträge und Charaktere, die du
                  gespeichert oder abonniert hast, an einem Ort — inklusive
                  der Möglichkeit, einzelne Follows wieder zu beenden.
                </p>
                <Link
                  href={`/users/${target.id}/follow`}
                  className="lcars-pill-btn--outline self-start"
                >
                  Follows verwalten
                </Link>
              </section>

              <SettingsForm user={{ name: target.name, email: target.email }} />

              <section id="password" className="flex flex-col gap-[12px]">
                <h2>
                  {hasPasswordSet ? "Passwort ändern" : "Passwort festlegen"}
                </h2>
                <PasswordForm hasPassword={hasPasswordSet} />
              </section>

              <section id="notifications" className="flex flex-col gap-[12px]">
                <h2>Benachrichtigungen</h2>
                <NotificationSettingsForm
                  user={{
                    emailEnabled: target.email_notifications_enabled,
                    pushEnabled: target.push_notifications_enabled,
                  }}
                />
              </section>

              <section id="install" className="flex flex-col gap-[12px]">
                <h2>App installieren</h2>
                <InstallPwaPrompt />
              </section>
            </div>
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
