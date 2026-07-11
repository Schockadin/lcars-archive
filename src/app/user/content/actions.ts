"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setCharacterVisibility } from "@/lib/characters";
import { setMissionLogVisibility, deleteMissionLog } from "@/lib/missions";
import { setDialogueVisibility } from "@/lib/dialogues";
import { setArchiveEntryVisibility } from "@/lib/archive";
import { notifyUserSubscribers } from "@/lib/follows";
import {
  revalidateCharacter,
  revalidateArchiveEntry,
  revalidateLog,
} from "@/lib/revalidate";
import { getBaseUrl } from "@/lib/http";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/visibility";

export type VisibilityContentType =
  | "character"
  | "mission_log"
  | "dialogue"
  | "archive_entry";

function isValidVisibility(value: string): value is Visibility {
  return (VISIBILITY_OPTIONS as readonly string[]).includes(value);
}

// Benachrichtigt Abonnenten des Users (target_type 'user', siehe
// notifyUserSubscribers in lib/follows.ts) NUR beim Wechsel auf public — ein
// Wechsel auf private/gm ist kein "neuer öffentlicher Inhalt" und daher kein
// Benachrichtigungs-Ereignis.
async function notifyIfPublic(
  visibility: Visibility,
  userId: number,
  input: { contentTypeLabel: string; title: string; url: string; preview: string },
): Promise<void> {
  if (visibility !== "public") return;
  await notifyUserSubscribers({
    authorUserId: userId,
    contentTypeLabel: input.contentTypeLabel,
    contentTitle: input.title,
    contentUrl: input.url,
    preview: input.preview,
  });
}

// Eine gemeinsame Action für alle vier Inhaltstypen aus "Meine Inhalte" statt
// vier fast identischer Varianten. Jede der setXVisibility-Schreibfunktionen
// scoped ihr UPDATE selbst auf den Owner — ein gefälschtes id trifft dann
// einfach 0 Zeilen, kein separater Vorab-Check hier nötig (gleiches Prinzip
// wie setBookmark/setSubscription in src/lib/follows.ts bzw.
// assignCharacterAction in src/app/admin/actions.ts).
//
// Gibt { error? } statt void zurück — VisibilitySelect.tsx braucht das für
// den Rollback des optimistischen useOptimistic-Werts: bleibt die
// Server-Antwort ohne Fehler, revalidiert revalidatePath unten die Seite
// mit dem neuen Wert; schlägt es fehl, bleibt der reale Wert unverändert
// und der optimistische fällt nach Abschluss der Transition automatisch
// darauf zurück.
export async function setVisibilityAction(
  contentType: VisibilityContentType,
  id: number,
  visibility: string,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };
  if (!isValidVisibility(visibility)) return { error: "Ungültige Sichtbarkeit." };

  const baseUrl = await getBaseUrl();
  let ok = false;
  if (contentType === "character") {
    const character = await setCharacterVisibility(session.userId, id, visibility);
    if (character) {
      revalidateCharacter(character.slug);
      ok = true;
      await notifyIfPublic(visibility, session.userId, {
        contentTypeLabel: "einen Charakter",
        title: character.name,
        url: `${baseUrl}/characters/${character.slug}`,
        preview: character.sourceMarkdown
          ? synopsisExcerpt(character.sourceMarkdown, 140)
          : "Die Akte wurde veröffentlicht.",
      });
    }
  } else if (contentType === "mission_log") {
    const log = await setMissionLogVisibility(session.userId, id, visibility);
    if (log) {
      revalidateLog(log.missionId, log.slug);
      ok = true;
      await notifyIfPublic(visibility, session.userId, {
        contentTypeLabel: "einen Mission-Log",
        title: log.title,
        url: `${baseUrl}/missions/${log.missionSlug}/${log.slug}`,
        preview: log.sourceMarkdown
          ? synopsisExcerpt(log.sourceMarkdown, 140)
          : "Der Log wurde veröffentlicht.",
      });
    }
  } else if (contentType === "dialogue") {
    const dialogue = await setDialogueVisibility(session.userId, id, visibility);
    if (dialogue) {
      revalidateArchiveEntry(dialogue.slug);
      ok = true;
      await notifyIfPublic(visibility, session.userId, {
        contentTypeLabel: "ein Gespräch",
        title: dialogue.title,
        url: `${baseUrl}/archive/${dialogue.slug}`,
        preview: "Das Gespräch wurde veröffentlicht.",
      });
    }
  } else {
    const entry = await setArchiveEntryVisibility(session.userId, id, visibility);
    if (entry) {
      revalidateArchiveEntry(entry.slug);
      ok = true;
      await notifyIfPublic(visibility, session.userId, {
        contentTypeLabel: "einen Archiv-Eintrag",
        title: entry.title,
        url: `${baseUrl}/archive/${entry.slug}`,
        preview: entry.sourceMarkdown
          ? synopsisExcerpt(entry.sourceMarkdown, 140)
          : "Der Eintrag wurde veröffentlicht.",
      });
    }
  }

  revalidatePath(`/user/${session.userId}/content`);
  return ok ? {} : { error: "Änderung fehlgeschlagen (keine Berechtigung?)." };
}

// Löschen eines eigenen Mission-Logs aus "Meine Inhalte" (DeleteMissionLogButton.tsx).
// deleteMissionLog scoped die DB-Löschung selbst auf den Owner (Spieler des
// Autor-Charakters) — ein gefälschtes id trifft 0 Zeilen, kein Vorab-Check
// hier nötig (gleiches Prinzip wie setVisibilityAction oben).
export async function deleteMissionLogAction(
  logId: number,
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet." };

  const deleted = await deleteMissionLog(session.userId, logId);
  if (!deleted) {
    return { error: "Log nicht gefunden oder keine Berechtigung." };
  }

  revalidateLog(deleted.missionId, deleted.slug);
  revalidatePath(`/user/${session.userId}/content`);

  return {};
}
