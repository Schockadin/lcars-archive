// Reine Entscheidungslogik für die Antwort-Reservierung bei Dialogen mit
// mehr als zwei Teilnehmenden (siehe Punkt 6 der Dialog-Überarbeitung) —
// bewusst ausgelagert aus /dialogues/[slug]/page.tsx, damit sie ohne
// DB-Verbindung unit-testbar ist (siehe dialogueLock.test.ts, keine
// Abhängigkeit auf @/lib/db). Muss exakt der serverseitigen Durchsetzung in
// postDialogueMessage (dialoguesCore.ts) entsprechen — bei genau zwei
// Teilnehmenden bleibt das Selbstgespräch-Verbot dort der einzige
// Schutzmechanismus, keine Reservierung nötig.
export interface DialogueLockHolder {
  heldByUserId: number;
}

export function canReplyToDialogue(
  participantCount: number,
  lockStatus: DialogueLockHolder | null,
  viewerUserId: number,
): boolean {
  if (participantCount <= 2) return true;
  return lockStatus !== null && lockStatus.heldByUserId === viewerUserId;
}
