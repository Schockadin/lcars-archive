export interface SessionSynopsisBlockInput {
  id?: number;
  ingameDate: string;
  body: string;
}

export function defaultSessionSynopsisDate(
  missionStartedAt: string | null | undefined,
  blocks: Pick<SessionSynopsisBlockInput, "ingameDate">[],
): string {
  const lastBlock = blocks.at(-1);
  const baseDate = lastBlock?.ingameDate || missionStartedAt;
  if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return "";
  if (!lastBlock) return baseDate;

  const [year, month, day] = baseDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
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
