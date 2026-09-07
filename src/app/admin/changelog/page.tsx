import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import {
  CHANGELOG,
  compareVersions,
  featuredChangelogEntries,
} from "@/lib/changelog";
import {
  getFeaturedChangelogVersions,
  getHiddenChangelogCategories,
} from "@/lib/changelogSettings";
import { listRolesForAdmin } from "@/lib/roles";
import ChangelogVisibilityForm, {
  type ChangelogVersionOption,
} from "./ChangelogVisibilityForm";
import ChangelogCategoryForm from "./ChangelogCategoryForm";

export const metadata: Metadata = {
  title: "Changelog",
  robots: { index: false, follow: false },
};

// /admin/changelog: der Admin wählt per Checkbox, welche Changelog-Versionen
// mit ihren Neuerungen auf dem Dashboard in der „Neue Funktionen"-Box erscheinen
// (src/app/ChangelogSection.tsx). Die Changelog-Einträge selbst sind
// code-gepflegt (src/lib/changelog.ts, siehe AGENTS.md); hier geht es nur um
// ihre Sichtbarkeit auf dem Dashboard.
export default async function AdminChangelogPage() {
  await requireAdmin();

  const [stored, hiddenByRole, roleRows] = await Promise.all([
    getFeaturedChangelogVersions(),
    getHiddenChangelogCategories(),
    listRolesForAdmin(),
  ]);
  // Effektiv angehakt: die gespeicherte Auswahl, sonst der Default (nur die
  // jüngste Version) — so spiegeln die Checkboxen, was aktuell wirklich
  // angezeigt wird.
  const selectedVersions = featuredChangelogEntries(stored).map((e) => e.version);

  const options: ChangelogVersionOption[] = [...CHANGELOG]
    .sort((a, b) => compareVersions(b.version, a.version))
    .map((entry) => ({
      version: entry.version,
      title: entry.title,
      itemCount: entry.items.length,
    }));

  return (
    <>
      <PageMeta title="Changelog" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Administration</p>
        <h1>Changelog-Sichtbarkeit</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p>
            Wähle, welche Versionen mit ihren Neuerungen auf dem Dashboard in der
            Box <strong>{"„Neue Funktionen“"}</strong> erscheinen. Die Auswahl gilt
            für alle eingeloggten User; die vollständige Liste bleibt unter{" "}
            <Link href="/changelog" className="underline">
              /changelog
            </Link>{" "}
            sichtbar.
          </p>
          <p className="text-lcars-ink-dim text-[13px]">
            Ohne Auswahl (keine Checkbox aktiv) verschwindet die Box; die
            Voreinstellung zeigt nur die jüngste Version.
          </p>

          <ChangelogVisibilityForm
            options={options}
            selectedVersions={selectedVersions}
          />

          <h2 className="mt-[8px]">Kategorien je Rolle</h2>
          <p>
            Jede Neuerung trägt eine Kategorie. Hier legst du fest, welche
            davon einer Rolle auf dem Dashboard <strong>nicht</strong> gezeigt
            werden — etwa Spielleitungs-Werkzeuge für reine Spieler-Konten.
            Angehakt heißt ausgeblendet.
          </p>
          <p className="text-lcars-ink-dim text-[13px]">
            Wer mehrere Rollen hat, sieht eine Kategorie, sobald mindestens
            eine seiner Rollen sie zeigt. Die vollständige Liste unter{" "}
            <Link href="/changelog" className="underline">
              /changelog
            </Link>{" "}
            bleibt unverändert sichtbar — dort wird nichts versteckt, nur
            sortiert und gefiltert.
          </p>

          <ChangelogCategoryForm
            roles={roleRows.map((role) => ({
              key: role.key,
              label: role.label,
            }))}
            hiddenByRole={hiddenByRole}
          />
        </div>
      </article>
    </>
  );
}
