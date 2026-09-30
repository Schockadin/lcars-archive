export interface SessionSynopsisBlockInput {
  id?: number;
  ingameDate: string;
  body: string;
}

export interface SessionSynopsisHistory {
  missionId: number | null;
  missionSessionNumber: number | null;
  synopsisBlocks: Pick<SessionSynopsisBlockInput, "ingameDate">[];
}

export function defaultSessionSynopsisDate(
  missionStartedAt: string | null | undefined,
  currentSessionBlocks: Pick<SessionSynopsisBlockInput, "ingameDate">[],
  previousSessionBlocks: Pick<SessionSynopsisBlockInput, "ingameDate">[] = [],
): string {
  const candidates = [
    missionStartedAt,
    nextIsoDate(currentSessionBlocks.at(-1)?.ingameDate),
    nextIsoDate(previousSessionBlocks.at(-1)?.ingameDate),
  ].filter((date): date is string => Boolean(date && isIsoDate(date)));
  return candidates.sort().at(-1) ?? "";
}

export function getPreviousSessionSynopsisBlocks(
  sessions: SessionSynopsisHistory[],
  missionId: number | null | undefined,
  beforeSessionNumber?: number | null,
): Pick<SessionSynopsisBlockInput, "ingameDate">[] {
  if (missionId == null) return [];
  const previous = sessions
    .filter(
      (session) =>
        session.missionId === missionId &&
        session.missionSessionNumber !== null &&
        (beforeSessionNumber == null ||
          session.missionSessionNumber < beforeSessionNumber),
    )
    .toSorted(
      (a, b) => b.missionSessionNumber! - a.missionSessionNumber!,
    )[0];
  return previous?.synopsisBlocks ?? [];
}

function nextIsoDate(date: string | undefined): string | null {
  if (!date || !isIsoDate(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  if (next.getUTCFullYear() > 9999) return null;
  return [
    String(next.getUTCFullYear()).padStart(4, "0"),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function sessionSynopsisHeading(ingameDate: string): string {
  return `## ${ingameDate}`;
}

export function buildMissionSynopsisMarkdown(
  blocks: SessionSynopsisBlockInput[],
): string {
  return blocks
    .filter((block) => block.body.trim())
    .map(
      (block) =>
        `${sessionSynopsisHeading(block.ingameDate)}\n\n${block.body.trim()}`,
    )
    .join("\n\n");
}
