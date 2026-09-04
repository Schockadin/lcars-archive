import Link from "next/link";
import type { Mention } from "@/lib/mentions";

// „Erwähnt in" — eingehende Verweise auf den gezeigten Inhalt. Für
// Archiv-Einträge gab es das schon (über archive_links); diese Komponente
// bringt es auch auf Charaktere, Missionen und Logbücher (siehe
// src/lib/mentions.ts).
//
// Rendert nichts, wenn es keine Erwähnungen gibt — eine leere Überschrift
// wäre nur Rauschen auf jeder zweiten Seite.
export default function MentionsSection({
  mentions,
  title = "Erwähnt in",
}: {
  mentions: Mention[];
  title?: string;
}) {
  if (mentions.length === 0) return null;
  return (
    <section className="flex flex-col gap-[8px]">
      <h2>{title}</h2>
      <ul className="flex flex-col gap-[4px]">
        {mentions.map((m) => (
          <li key={`${m.kind}:${m.slug}`} className="flex flex-wrap items-baseline gap-[8px]">
            <Link href={m.href} className="lcars-wikilink">
              {m.title}
            </Link>
            <span className="text-lcars-ink-dim font-lcars-mono text-[12px]">
              {m.sublabel}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
