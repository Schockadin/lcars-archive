"use server";
import { requireAdmin } from "@/lib/dal";
import {
  previewArchiveMarkdown,
  commitArchiveMarkdown,
  previewMissionMarkdown,
  commitMissionMarkdown,
  previewCharacterMarkdown,
  commitCharacterMarkdown,
  type ArchivePreviewResult,
  type MissionPreviewResult,
  type CharacterPreviewResult,
  type CommitResult,
} from "@/lib/markdownImport";
import {
  revalidateArchiveEntry,
  revalidateMission,
  revalidateCharacter,
} from "@/lib/revalidate";

export type ImportContentType = "archive" | "mission" | "character";
export type ImportPreviewResult =
  | ArchivePreviewResult
  | MissionPreviewResult
  | CharacterPreviewResult;

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
        : previewCharacterMarkdown;

  // Reine Lese-Operationen (Frontmatter parsen, Slug-Kollision prüfen) —
  // unabhängig voneinander, deshalb parallel statt sequentiell.
  return Promise.all(files.map((f) => previewFn(f.filename, f.content)));
}

// Legt EINEN einzelnen Eintrag an — wird erst nach expliziter Bestätigung
// der Preview pro Datei aufgerufen (siehe MarkdownImportPanel.tsx). Parst
// die rohe Markdown-Datei server-seitig erneut statt der bereits geparsten
// Preview zu vertrauen — die Rohdatei bleibt die alleinige Quelle der
// Wahrheit, nicht ein vom Client zurückgereichtes, potenziell manipulierbares
// Zwischenergebnis.
export async function confirmMarkdownImportAction(
  contentType: ImportContentType,
  filename: string,
  content: string,
): Promise<CommitResult> {
  await requireAdmin();

  const commitFn =
    contentType === "archive"
      ? commitArchiveMarkdown
      : contentType === "mission"
        ? commitMissionMarkdown
        : commitCharacterMarkdown;

  const result = await commitFn(filename, content);
  if (result.ok) {
    if (contentType === "archive") revalidateArchiveEntry(result.slug);
    else if (contentType === "mission") revalidateMission(result.slug);
    else revalidateCharacter(result.slug);
  }
  return result;
}
