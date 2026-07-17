"use server";
import { requireAdmin } from "@/lib/dal";
import {
  previewArchiveMarkdown,
  commitArchiveMarkdown,
  previewMissionMarkdown,
  commitMissionMarkdown,
  previewCharacterMarkdown,
  commitCharacterMarkdown,
  previewMissionLogMarkdown,
  commitMissionLogMarkdown,
  type ArchivePreviewResult,
  type MissionPreviewResult,
  type CharacterPreviewResult,
  type MissionLogPreviewResult,
  type ArchiveImportEdits,
  type MissionImportEdits,
  type CharacterImportEdits,
  type MissionLogImportEdits,
  type CommitResult,
} from "@/lib/markdownImport";
import {
  revalidateArchiveEntry,
  revalidateMission,
  revalidateCharacter,
  revalidateAllContent,
} from "@/lib/revalidate";

export type ImportContentType = "archive" | "mission" | "character" | "mission_log";
export type ImportPreviewResult =
  | ArchivePreviewResult
  | MissionPreviewResult
  | CharacterPreviewResult
  | MissionLogPreviewResult;
export type ImportEdits =
  | ArchiveImportEdits
  | MissionImportEdits
  | CharacterImportEdits
  | MissionLogImportEdits;

export interface UploadedFile {
  filename: string;
  content: string;
}

// Reiner Parse-Schritt ohne DB-Schreibzugriff — kann beliebig oft neu
// aufgerufen werden (z.B. nach erneutem Datei-Auswählen), ohne Nebenwirkung.
export async function previewMarkdownImportAction(
  contentType: ImportContentType,
  files: UploadedFile[],
): Promise<ImportPreviewResult[]> {
  await requireAdmin();

  const previewFn =
    contentType === "archive"
      ? previewArchiveMarkdown
      : contentType === "mission"
        ? previewMissionMarkdown
        : contentType === "character"
          ? previewCharacterMarkdown
          : previewMissionLogMarkdown;

  // Reine Lese-Operationen (Frontmatter parsen, Slug-/Referenz-Auflösung) —
  // unabhängig voneinander, deshalb parallel statt sequentiell.
  return Promise.all(files.map((f) => previewFn(f.filename, f.content)));
}

// Legt EINEN einzelnen Eintrag an — wird erst nach expliziter Bestätigung
// der (in der UI editierbaren) Vorschau pro Datei aufgerufen (siehe
// MarkdownImportPanel.tsx). edits enthält die aktuellen (ggf. von der
// Administration angepassten) Feldwerte und gewinnt beim Commit gegenüber
// dem ursprünglich geparsten Frontmatter — siehe Kopfkommentar in
// markdownImport.ts für die Begründung, warum das kein Sicherheitsproblem
// ist (requireAdmin() gilt für beide Actions).
export async function confirmMarkdownImportAction(
  contentType: ImportContentType,
  filename: string,
  content: string,
  edits: ImportEdits,
): Promise<CommitResult> {
  await requireAdmin();

  let result: CommitResult;
  if (contentType === "archive") {
    result = await commitArchiveMarkdown(filename, content, edits as ArchiveImportEdits);
  } else if (contentType === "mission") {
    result = await commitMissionMarkdown(filename, content, edits as MissionImportEdits);
  } else if (contentType === "character") {
    result = await commitCharacterMarkdown(filename, content, edits as CharacterImportEdits);
  } else {
    result = await commitMissionLogMarkdown(filename, content, edits as MissionLogImportEdits);
  }

  if (result.ok) {
    if (contentType === "archive") revalidateArchiveEntry(result.slug);
    else if (contentType === "mission") revalidateMission(result.slug);
    else if (contentType === "character") revalidateCharacter(result.slug);
    // Missionslogs: kein dediziertes revalidate*(slug) hier — revalidateLog
    // braucht die mission_id, die dem Aufrufer hier nicht vorliegt (nur die
    // neue Log-id). Grobkörnige Invalidierung statt Zusatz-Query, analog zum
    // Admin-Backfill in DialogueContentRegeneratePanel.tsx — ein seltener
    // Admin-Vorgang, kein Hot Path.
    else revalidateAllContent();
  }
  return result;
}
