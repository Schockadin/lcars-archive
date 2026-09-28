export function appendSessionSynopsis(
  current: string | null,
  sessionDate: string,
  outcome: string,
): string {
  const section = `## Session vom ${sessionDate}\n\n${outcome.trim()}`;
  return [current?.trim(), section].filter(Boolean).join("\n\n");
}
