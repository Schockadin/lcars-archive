"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setCharacterVisibility } from "@/lib/characters";
import { setMissionLogVisibility, deleteMissionLog } from "@/lib/missions";
import { setDialogueVisibility } from "@/lib/dialogues";
import { setArchiveEntryVisibility } from "@/lib/archive";
import { deleteVaultFile } from "@/lib/githubVault";
import {
  revalidateCharacter,
  revalidateArchiveEntry,
  revalidateLog,
} from "@/lib/revalidate";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/visibility";

export type VisibilityContentType =
  | "character"
  | "mission_log"
  | "dialogue"
  | "archive_entry";

function isValidVisibility(value: string): value is Visibility {
  return (VISIBILITY_OPTIONS as readonly string[]).includes(value);
}

// Eine gemeinsame Action für alle vier Inhaltstypen aus "Meine Inhalte" statt
// vier fast identischer Varianten. Jede der setXVisibility-Schreibfunktionen
// scoped ihr UPDATE selbst auf den Owner — ein gefälschtes id trifft dann
// einfach 0 Zeilen, kein separater Vorab-Check hier nötig (gleiches Prinzip
// wie setBookmark/setSubscription in src/lib/follows.ts bzw.
// assignCharacterAction in src/app/users/actions.ts).
export async function setVisibilityAction(
  contentType: VisibilityContentType,
  id: number,
  visibility: string,
): Promise<void> {
  const session = await getSession();
  if (!session) return;
  if (!isValidVisibility(visibility)) return;

  if (contentType === "character") {
    const character = await setCharacterVisibility(session.userId, id, visibility);
    if (character) revalidateCharacter(character.slug);
  } else if (contentType === "mission_log") {
    const log = await setMissionLogVisibility(session.userId, id, visibility);
    if (log) revalidateLog(log.missionId, log.slug);
  } else if (contentType === "dialogue") {
    const dialogue = await setDialogueVisibility(session.userId, id, visibility);
    if (dialogue) revalidateArchiveEntry(dialogue.slug);
  } else {
    const entry = await setArchiveEntryVisibility(session.userId, id, visibility);
    if (entry) revalidateArchiveEntry(entry.slug);
  }

  revalidatePath(`/users/${session.userId}/content`);
}

// Löschen eines eigenen Mission-Logs aus "Meine Inhalte" (DeleteMissionLogButton.tsx).
// deleteMissionLog scoped die DB-Löschung selbst auf den Owner (Spieler des
// Autor-Charakters) — ein gefälschtes id trifft 0 Zeilen, kein Vorab-Check
// hier nötig (gleiches Prinzip wie setVisibilityAction oben). Die
// Vault-Datei-Löschung ist Best-Effort: schlägt sie fehl (Datei anders
// benannt, Token fehlt, GitHub nicht erreichbar), bleibt das Log trotzdem
// aus der DB entfernt — das ist für den User das eigentlich sichtbare
// Ergebnis.
export async function deleteMissionLogAction(
  logId: number,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const deleted = await deleteMissionLog(session.userId, logId);
  if (!deleted) {
    return { error: "Log nicht gefunden oder keine Berechtigung." };
  }

  try {
    await deleteVaultFile({
      path: `Missionen/${deleted.missionSlug}/${deleted.slug}.md`,
      message: `Missionslog gelöscht: ${deleted.slug} (via Web-App)`,
    });
  } catch (err) {
    console.error(
      `Vault-Löschung für "${deleted.slug}" fehlgeschlagen (Log bleibt trotzdem aus der DB entfernt):`,
      err,
    );
  }

  revalidateLog(deleted.missionId, deleted.slug);
  revalidatePath(`/users/${session.userId}/content`);
  return {};
}
