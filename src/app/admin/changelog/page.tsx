import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireAdmin } from "@/lib/dal";
import { CHANGELOG, featuredChangelogEntries } from "@/lib/changelog";
import { getFeaturedChangelogVersions } from "@/lib/changelogSettings";
import ChangelogVisibilityForm, {
  type ChangelogVersionOption,
} from "./ChangelogVisibilityForm";

export const metadata: Metadata = {
  title: "Changelog",
  robots: { index: false, follow: false },
};

// Numerischer „Major.Minor"-Vergleich (String-Vergleich sortierte „1.9" hinter
// „1.10") — für die Anzeige neueste Version zuerst.
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// /admin/changelog: der Admin wählt per Checkbox, welche Changelog-Versionen
// mit ihren Neuerungen auf dem Dashboard in der „Neue Funktionen"-Box erscheinen
// (src/app/ChangelogSection.tsx). Die Changelog-Einträge selbst sind
// code-gepflegt (src/lib/changelog.ts, siehe AGENTS.md); hier geht es nur um
// ihre Sichtbarkeit auf dem Dashboard.
export default async function AdminChangelogPage() {
  await requireAdmin();

  const stored = await getFeaturedChangelogVersions();
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
        </div>
      </article>
    </>
  );
}
