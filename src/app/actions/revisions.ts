"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/visibility";
import {
  canManageRevisions,
  getRevisionSource,
  isRevisionContentType,
  type RevisionContentType,
} from "@/lib/contentRevisions";
import { updateOwnCharacterBio } from "@/lib/characters";
import { updateMissionSynopsis, updateMissionLogSourceMd } from "@/lib/missions";
import { updateOwnArchiveEntryBody } from "@/lib/archive";
import { renderContentHtml } from "@/lib/autolink";

export interface RevisionActionState {
  error?: string;
  success?: boolean;
}

// Holt eine frühere Fassung des Textes zurück. Wiederhergestellt wird NUR der
// Fließtext — Titel, Stammdaten und Sichtbarkeit bleiben, wie sie sind (siehe
// contentRevisions.ts). Der aktuelle Stand geht dabei nicht verloren: die
// Wiederherstellung läuft über dieselben Update-Funktionen wie eine normale
// Bearbeitung und legt ihn deshalb selbst wieder als Fassung ab.
//
// Wie bei den Notiz-Actions gilt: eine Server Action ist ein öffentlicher
// Endpunkt und prüft die Rechte selbst — canManageRevisions entscheidet, nicht
// die aufrufende Seite.
export async function restoreRevisionAction(
  _state: RevisionActionState,
  formData: FormData,
): Promise<RevisionActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Nur für angemeldete Personen." };

  const rawType = String(formData.get("contentType") ?? "");
  if (!isRevisionContentType(rawType)) return { error: "Unbekannter Inhalt." };
  const contentType: RevisionContentType = rawType;

  const contentId = Number(formData.get("contentId"));
  const revisionId = Number(formData.get("revisionId"));
  if (!Number.isInteger(contentId) || !Number.isInteger(revisionId)) {
    return { error: "Unbekannte Fassung." };
  }

  if (!(await canManageRevisions(contentType, contentId, viewer))) {
    return { error: "Keine Berechtigung für diesen Inhalt." };
  }

  const source = await getRevisionSource(contentType, contentId, revisionId);
  if (source == null) return { error: "Diese Fassung gibt es nicht mehr." };

  const restored = await restoreBody(contentType, contentId, viewer.userId, source);
  if (!restored) return { error: "Wiederherstellen fehlgeschlagen." };

  const path = String(formData.get("path") ?? "");
  if (path) revalidatePath(path);
  return { success: true };
}

async function restoreBody(
  contentType: RevisionContentType,
  contentId: number,
  userId: number,
  source: string,
): Promise<boolean> {
  if (contentType === "character") {
    // Owner-gescoped in SQL: schlägt fehl, wenn der Charakter jemand anderem
    // gehört. Moderation läuft daher über den Admin-Bereich, nicht hier.
    const row = await updateOwnCharacterBio(userId, contentId, source);
    return row != null;
  }
  if (contentType === "archive") {
    const row = await updateOwnArchiveEntryBody(userId, contentId, source);
    return row != null;
  }
  if (contentType === "mission") {
    const row = await updateMissionSynopsis(contentId, source, userId);
    return row != null;
  }
  // mission_log: die Update-Funktion rendert nicht selbst.
  const html = await renderContentHtml(source);
  await updateMissionLogSourceMd(contentId, source, html, userId);
  return true;
}
