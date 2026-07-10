import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import type { FollowedContent, FollowTargetType } from "@/lib/follows";

const TYPE_LABELS: Record<FollowTargetType, string> = {
  mission: "Mission",
  archive_entry: "Archiv-Eintrag",
  character: "Charakter",
  user: "User",
};

// Gleicher Kartenstil wie die Akkordeons in UserContentBrowser.tsx — hier
// ohne Meta-Zeile, da FollowedContent nur Titel + Ziel-Typ liefert. Ganz
// ausgeblendet statt Leerzustand-Platzhalter, wenn es nichts anzuzeigen
// gibt (Dashboard soll keine leeren DataRows zeigen).
export default function FollowedContentSection({
  heading,
  items,
}: {
  heading: string;
  items: FollowedContent[];
}) {
  if (items.length === 0) return null;

  return (
    <LcarsDataRow
      value={items.length}
      label={heading}
      color="var(--lcars-amber)"
      accentColor="var(--lcars-blue)"
    >
      <div className="flex flex-col gap-[6px]">
        {items.map((item) => (
          <Link
            key={`${item.targetType}-${item.slug}`}
            href={item.href}
            className="mission-akte"
            style={
              { "--mission-color": "var(--lcars-amber)" } as React.CSSProperties
            }
          >
            <span className="mission-akte-rail" />
            <span className="mission-akte-body text-left">
              <span className="mission-akte-title block">{item.title}</span>
              <span className="mission-akte-meta">
                <span>
                  <b>Typ</b> {TYPE_LABELS[item.targetType]}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </LcarsDataRow>
  );
}
