import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { CHANGELOG } from "@/lib/changelog";
import ChangelogList from "./ChangelogList";

export const metadata: Metadata = {
  title: "Changelog",
  robots: { index: false },
};

// Öffentliche, statische Changelog-Seite — erreichbar für alle (auch
// anonyme Besucher), verlinkt über die Versionsnummer im Footer (siehe
// ElbowBar.tsx). Ein Akkordeon pro Major.Minor-Version (siehe
// src/lib/changelog.ts), Inhalt statisch gepflegt statt aus GitHub-PRs zur
// Laufzeit geladen — siehe AGENTS.md für die Pflege-Vorgabe.
export default function ChangelogPage() {
  return (
    <>
      <PageMeta title="Changelog" section="changelog" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <h1>Changelog</h1>
        <p className="lcars-text mb-[16px]">
          Alle größeren Änderungen am Archiv, Version für Version.
        </p>
        <ChangelogList entries={CHANGELOG} />
      </article>
    </>
  );
}
