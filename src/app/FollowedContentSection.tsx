import { LcarsAkteCard, LcarsDataRow } from "@/components/lcars";
import type { FollowedContent, FollowTargetType } from "@/lib/follows";

const TYPE_LABELS: Record<FollowTargetType, string> = {
  mission: "Mission",
  archive_entry: "Datenbank-Eintrag",
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
    >
      <div className="flex flex-col gap-[6px]">
        {items.map((item) => (
          <LcarsAkteCard
            key={`${item.targetType}-${item.slug}`}
            href={item.href}
            color="var(--lcars-primary)"
            title={item.title}
            meta={
              <span>
                <b>Typ</b> {TYPE_LABELS[item.targetType]}
              </span>
            }
          />
        ))}
      </div>
    </LcarsDataRow>
  );
}
