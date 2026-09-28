export interface SessionSynopsisBlockInput {
  ingameDate: string;
  endDate: string | null;
  body: string;
}

export function defaultSessionSynopsisDate(
  missionStartedAt: string | null | undefined,
  blocks: Pick<SessionSynopsisBlockInput, "ingameDate" | "endDate">[],
): string {
  const lastBlock = blocks.at(-1);
  const baseDate = lastBlock?.endDate || lastBlock?.ingameDate || missionStartedAt;
  if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return "";

  const [year, month, day] = baseDate.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  return nextDate.toISOString().slice(0, 10);
}

export function sessionSynopsisHeading(
  ingameDate: string,
  endDate: string | null,
): string {
  return endDate
    ? `## Synopsis ${ingameDate}–${endDate}`
    : `## Synopsis ${ingameDate}`;
}

export function buildMissionSynopsisMarkdown(
  blocks: SessionSynopsisBlockInput[],
): string {
  return blocks
    .filter((block) => block.body.trim())
    .map(
      (block) =>
        `${sessionSynopsisHeading(block.ingameDate, block.endDate)}\n\n${block.body.trim()}`,
    )
    .join("\n\n");
}
