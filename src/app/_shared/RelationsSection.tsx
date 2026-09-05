import Link from "next/link";
import SettingsPanel from "@/app/_shared/SettingsPanel";
import type { Relation } from "@/lib/relations";

// „Wer kennt wen" auf der Charakterseite. Zeigt zu jeder Verbindung, WORAUS
// sie stammt (gemeinsame Missionen/Gespräche) — eine bloße Namensliste ohne
// Begründung wäre schwer einzuordnen.
function reason(r: Relation): string {
  const parts: string[] = [];
  if (r.sharedMissions > 0) {
    parts.push(
      r.sharedMissions === 1 ? "1 Mission" : `${r.sharedMissions} Missionen`,
    );
  }
  if (r.sharedDialogues > 0) {
    parts.push(
      r.sharedDialogues === 1 ? "1 Gespräch" : `${r.sharedDialogues} Gespräche`,
    );
  }
  return parts.join(" · ");
}

export default function RelationsSection({
  relations,
  title = "Wer kennt wen",
}: {
  relations: Relation[];
  title?: string;
}) {
  if (relations.length === 0) return null;
  return (
    // Aufklappbar wie Notizen, Versionen und „Erwähnt in" — der Abschnitt ist
    // Beiwerk unter dem eigentlichen Inhalt.
    <SettingsPanel
      title={title}
      hint="Abgeleitet aus gemeinsamen Missionen und Gesprächen"
      badge={`${relations.length} ${relations.length === 1 ? "Verbindung" : "Verbindungen"}`}
    >
      <p className="text-lcars-ink-dim text-[13px]">
        <Link href="/characters/beziehungen" className="lcars-wikilink">
          Ganze Kampagne als Graph
        </Link>
      </p>
      <ul className="flex flex-col gap-[4px]">
        {relations.map((r) => (
          <li
            key={`${r.kind}:${r.slug}`}
            className="flex flex-wrap items-baseline gap-[8px]"
          >
            <Link href={r.href} className="lcars-wikilink">
              {r.name}
            </Link>
            <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
              {reason(r)}
              {r.kind === "npc" ? " · NPC" : ""}
            </span>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  );
}
