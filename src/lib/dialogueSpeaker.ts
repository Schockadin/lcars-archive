// Wer spricht in einem Gespräch? Zwei Sorten von Sprechern, die dieselbe
// Rolle einnehmen:
//
//   character — ein Charakter (Tabelle characters, gehört einer Person)
//   npc       — ein NPC: ein Datenbank-Eintrag der Kategorie "npc"
//               (archive_entries), der niemandem gehört; für ihn schreibt in
//               genau diesem Gespräch ein Konto der Spielleitung (siehe
//               dialogue_npc_speakers).
//
// Beides sind eigene Tabellen mit eigenen, überlappenden IDs — deshalb reicht
// eine Zahl allein nicht aus, um einen Sprecher zu benennen. Formulare und
// Auswahlfelder tragen ihn als kurzen Schlüssel ("c12" / "n7"); diese Datei
// ist bewusst DB-frei, damit auch Client-Komponenten ihn bilden und lesen
// können.
export type SpeakerKind = "character" | "npc";

export interface DialogueSpeaker {
  kind: SpeakerKind;
  id: number;
}

export function speakerKey(speaker: DialogueSpeaker): string {
  return `${speaker.kind === "character" ? "c" : "n"}${speaker.id}`;
}

export function parseSpeakerKey(value: string): DialogueSpeaker | null {
  const match = /^([cn])(\d+)$/.exec(value.trim());
  if (!match) return null;
  const id = Number(match[2]);
  if (!Number.isInteger(id) || id <= 0) return null;
  return { kind: match[1] === "c" ? "character" : "npc", id };
}

// Gleicher Sprecher? Vergleicht Sorte UND ID — ein Charakter 7 und ein NPC 7
// sind zwei verschiedene Sprecher.
export function sameSpeaker(
  a: DialogueSpeaker | null,
  b: DialogueSpeaker | null,
): boolean {
  return a != null && b != null && a.kind === b.kind && a.id === b.id;
}
