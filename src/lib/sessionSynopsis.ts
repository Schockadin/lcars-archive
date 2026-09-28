export interface SessionSynopsisBlockInput {
  ingameDate: string;
  endDate: string | null;
  body: string;
}

export function addOneDayToSynopsisDate(date: string | null | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";

  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.toISOString().slice(0, 10) !== date) return "";
  parsedDate.setUTCDate(parsedDate.getUTCDate() + 1);
  return parsedDate.toISOString().slice(0, 10);
}

export function defaultSessionSynopsisDate(
  missionStartedAt: string | null | undefined,
  blocks: Pick<SessionSynopsisBlockInput, "ingameDate" | "endDate">[],
): string {
  const lastBlock = blocks.at(-1);
  const baseDate = lastBlock?.endDate || lastBlock?.ingameDate || missionStartedAt;
  return lastBlock ? addOneDayToSynopsisDate(baseDate) : (baseDate ?? "");
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
