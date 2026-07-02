import Link from "next/link";
import type { FollowedContent } from "@/lib/follows";

// Gleicher Kartenstil wie RecentActivity.tsx — hier ohne Meta-Zeile, da
// FollowedContent nur Titel + Ziel-Typ liefert.
export default function FollowedContentSection({
  heading,
  emptyLabel,
  items,
}: {
  heading: string;
  emptyLabel: string;
  items: FollowedContent[];
}) {
  return (
    <section className="flex flex-col gap-[8px]">
      <p className="lcars-eyebrow">{heading}</p>

      {items.length === 0 ? (
        <p className="char-file-bio-empty">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {items.map((item) => (
            <Link
              key={`${item.targetType}-${item.slug}`}
              href={item.href}
              className="mission-akte"
              style={{ "--mission-color": "var(--lcars-amber)" } as React.CSSProperties}
            >
              <span className="mission-akte-rail" />
              <span className="mission-akte-body text-left">
                <span className="mission-akte-title block">{item.title}</span>
                <span className="mission-akte-meta">
                  <span>
                    <b>Typ</b>{" "}
                    {item.targetType === "mission" ? "Mission" : "Archiv-Eintrag"}
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
