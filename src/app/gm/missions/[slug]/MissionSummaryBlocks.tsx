import Link from "next/link";
import type { MissionSynopsisBlock } from "@/lib/gameSessions";
import { fmtDate } from "@/lib/missionFormat";

export default function MissionSummaryBlocks({
  missionTitle,
  blocks,
}: {
  missionTitle: string;
  blocks: MissionSynopsisBlock[];
}) {
  return (
    <section className="flex flex-col gap-[12px]">
      <h2 className="text-lcars-primary-ink">Summary-Blöcke</h2>
      {blocks.length === 0 ? (
        <p className="lcars-empty-state">
          Für diese Mission gibt es noch keine Summary-Blöcke.
        </p>
      ) : (
        <ol className="flex flex-col gap-[10px]">
          {blocks.map((block) => (
            <li
              key={block.id}
              className="rounded-lg border border-[var(--lcars-ink-dim)]/30 p-[12px]"
            >
              <div className="mb-[6px] flex flex-wrap items-baseline justify-between gap-[8px]">
                <h3 className="font-semibold">
                  {missionTitle} - Eintrag {block.missionSessionNumber ?? "?"}
                </h3>
                <span className="lcars-eyebrow">{fmtDate(block.ingameDate)}</span>
              </div>
              <div
                className="mission-body"
                dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
              />
              {block.sessionId !== null && (
                <Link
                  href={`#session-${block.sessionId}`}
                  className="lcars-back-link mt-[8px] inline-block"
                >
                  Zur zugehörigen Session
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
