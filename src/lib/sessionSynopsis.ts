export interface SessionSynopsisBlockInput {
  ingameDate: string;
  endDate: string | null;
  body: string;
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
