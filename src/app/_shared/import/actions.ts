"use server";
import { getCurrentUser, getRoleMap } from "@/lib/dal";
import { userCan } from "@/lib/permissions";
import { mayImport, type ImportContentType } from "@/lib/importAccess";
import { ownsCharacterSlug } from "@/lib/characters";
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

// Re-Export, damit die Client-Komponente daneben (MarkdownImportPanel) den
// Typ nicht aus einem "server-only"-Modul ziehen muss. Die Wahrheit über die
// vier Arten steht in src/lib/importAccess.ts.
export type { ImportContentType };
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

interface ImportAccess {
  ok: true;
  userId: number;
  // Der Eigentümer, der erzwungen wird — null heißt „frei wählbar“ und gilt
  // nur für die Administration (die /admin/import auch für fremde Inhalte
  // nutzt, etwa beim Umzug aus dem Vault).
  forcedOwnerSlug: string | null;
}

// Die gemeinsame Schranke beider Actions. Sie ersetzt das frühere
// requireAdmin(): Der Import steht seit v1.50 auch der normalen Nutzerschaft
// offen (Knopf im Abschnitt „Neue Inhalte“), und zwar je Inhaltsart mit
// genau der Berechtigung, die auch das normale Anlege-Formular verlangt —
// die Matrix dazu steht in src/lib/importAccess.ts.
//
// Kein forbidden()/throw, sondern ein Ergebnis: Beide Actions werden
// programmatisch aufgerufen (kein <form action>), wo ein Auth-Interrupt beim
// Client nur als nichtssagender Fehler ankäme (siehe checkPermission in
// dal.ts). Die Meldung landet stattdessen sichtbar an der jeweiligen Datei.
async function checkImportAccess(
  contentType: ImportContentType,
): Promise<ImportAccess | { ok: false; error: string }> {
  const user = await getCurrentUser();
  const roleMap = await getRoleMap();
  if (!mayImport(user, roleMap, contentType)) {
    return {
      ok: false,
      error: "Für diese Inhaltsart fehlt dir die Berechtigung.",
    };
  }
  return {
    ok: true,
    userId: user.id,
    forcedOwnerSlug: userCan(user, "admin.access", roleMap) ? null : user.slug,
  };
}

// Der Eigentümer aus der Datei (bzw. aus dem Formularfeld daneben) zählt nur
// für die Administration. Für alle anderen wird er hier überschrieben —
// markdownImport.ts selbst prüft ihn nicht, es schreibt, was es bekommt.
function withForcedOwner<T extends { ownerSlug: string | null }>(
  edits: T,
  forcedOwnerSlug: string | null,
): T {
  return forcedOwnerSlug === null ? edits : { ...edits, ownerSlug: forcedOwnerSlug };
}

// Reiner Parse-Schritt ohne DB-Schreibzugriff — kann beliebig oft neu
// aufgerufen werden (z.B. nach erneutem Datei-Auswählen), ohne Nebenwirkung.
export async function previewMarkdownImportAction(
  contentType: ImportContentType,
  files: UploadedFile[],
): Promise<ImportPreviewResult[]> {
  const access = await checkImportAccess(contentType);
  if (!access.ok) {
    // Eine Fehlerzeile je Datei statt eines Wurfs: Die Oberfläche zeigt sie
    // dort an, wo sonst die Vorschau stünde.
    return files.map((f) => ({
      ok: false as const,
      filename: f.filename,
      error: access.error,
    }));
  }

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
// MarkdownImportPanel.tsx). edits enthält die aktuellen (ggf. angepassten)
// Feldwerte und gewinnt beim Commit gegenüber dem ursprünglich geparsten
// Frontmatter — siehe Kopfkommentar in markdownImport.ts. Genau deshalb
// stehen hier die beiden Korrekturen, die dieses Übergewicht wieder
// einfangen: erzwungener Eigentümer und, beim Missionslog, nur eine eigene
// Autoren-Figur.
export async function confirmMarkdownImportAction(
  contentType: ImportContentType,
  filename: string,
  content: string,
  edits: ImportEdits,
): Promise<CommitResult> {
  const access = await checkImportAccess(contentType);
  if (!access.ok) return { ok: false, error: access.error };

  let result: CommitResult;
  if (contentType === "archive") {
    result = await commitArchiveMarkdown(
      filename,
      content,
      withForcedOwner(edits as ArchiveImportEdits, access.forcedOwnerSlug),
    );
  } else if (contentType === "mission") {
    result = await commitMissionMarkdown(
      filename,
      content,
      withForcedOwner(edits as MissionImportEdits, access.forcedOwnerSlug),
    );
  } else if (contentType === "character") {
    result = await commitCharacterMarkdown(
      filename,
      content,
      withForcedOwner(edits as CharacterImportEdits, access.forcedOwnerSlug),
    );
  } else {
    const logEdits = withForcedOwner(
      edits as MissionLogImportEdits,
      access.forcedOwnerSlug,
    );
    // Ein Logbuch trägt den Namen einer Figur. Ohne diese Prüfung könnte
    // jede Person mit content.create ein Log im Namen einer FREMDEN Figur
    // anlegen — das normale Formular bietet dafür nur die eigenen an, und
    // der Import darf kein zweiter Weg an derselben Regel vorbei sein.
    if (
      access.forcedOwnerSlug !== null &&
      !(await ownsCharacterSlug(access.userId, logEdits.authorSlug))
    ) {
      // Deckt beide Fälle ab: eine fremde Figur im Feld — und gar keine,
      // denn eine fremde aus dem Frontmatter steht in der Auswahlliste
      // dieser Person nicht und kommt deshalb leer zurück.
      return {
        ok: false,
        error:
          "Ein Logbuch lässt sich nur einer eigenen, veröffentlichten Figur " +
          "zuschreiben — bitte eine aus der Liste wählen.",
      };
    }
    result = await commitMissionLogMarkdown(filename, content, logEdits);
  }

  if (result.ok) {
    if (contentType === "archive") revalidateArchiveEntry(result.slug);
    else if (contentType === "mission") revalidateMission(result.slug);
    else if (contentType === "character") revalidateCharacter(result.slug);
    // Missionslogs: kein dediziertes revalidate*(slug) hier — revalidateLog
    // braucht die mission_id, die dem Aufrufer hier nicht vorliegt (nur die
    // neue Log-id). Grobkörnige Invalidierung statt Zusatz-Query, analog zum
    // Admin-Backfill in DialogueContentRegeneratePanel.tsx — ein seltener
    // Vorgang, kein Hot Path.
    else revalidateAllContent();
  }
  return result;
}
