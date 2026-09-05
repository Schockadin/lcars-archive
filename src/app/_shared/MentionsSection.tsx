import Link from "next/link";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import type { Mention } from "@/lib/mentions";

// „Erwähnt in" — eingehende Verweise auf den gezeigten Inhalt. Für
// Archiv-Einträge gab es das schon (über archive_links); diese Komponente
// bringt es auch auf Charaktere, Missionen und Logbücher (siehe
// src/lib/mentions.ts).
//
// Rendert nichts, wenn es keine Erwähnungen gibt — eine leere Überschrift
// wäre nur Rauschen auf jeder zweiten Seite.
//
// Aufklappbar wie die Notizen und die Versionshistorie (SettingsPanel,
// natives <details>): der Abschnitt ist Beiwerk unter dem eigentlichen
// Inhalt, die Anzahl in der Kopfzeile genügt zum Überfliegen.
export default function MentionsSection({
  mentions,
  title = "Erwähnt in",
}: {
  mentions: Mention[];
  title?: string;
}) {
  if (mentions.length === 0) return null;
  return (
    <SettingsPanel
      title={title}
      stacked
      hint="Inhalte, die auf diesen Eintrag verweisen"
      badge={`${mentions.length} ${mentions.length === 1 ? "Erwähnung" : "Erwähnungen"}`}
    >
      <ul className="flex flex-col gap-[4px]">
        {mentions.map((m) => (
          <li
            key={`${m.kind}:${m.slug}`}
            className="flex flex-col items-start gap-[2px]"
          >
            <Link href={m.href} className="lcars-wikilink">
              {m.title}
            </Link>
            <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
              {m.sublabel}
            </span>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  );
}
