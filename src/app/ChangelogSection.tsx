import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import { latestChangelogEntry } from "@/lib/changelog";

// „Neu in Version …" auf dem Dashboard, direkt über den Neuigkeiten: der
// jüngste Changelog-Eintrag (siehe /changelog) als eigenes Akkordeon.
// Bewusst eingeklappt — die Neuigkeiten darunter sind das, was sich täglich
// ändert; die Versionsliste liest man einmal je Release.
export default function ChangelogSection() {
  const latest = latestChangelogEntry();
  if (!latest) return null;

  return (
    <LcarsDataRow
      value={latest.items.length}
      label={`Neu in Version ${latest.version}`}
      color="var(--lcars-tertiary)"
    >
      <div id="changelog" className="lcars-text flex flex-col gap-[12px]">
        <h2>{latest.title}</h2>
        <ul className="flex list-disc flex-col gap-[4px] pl-[20px]">
          {latest.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          <Link href="/changelog" className="underline">
            Alle Änderungen ansehen
          </Link>
        </p>
      </div>
    </LcarsDataRow>
  );
}
