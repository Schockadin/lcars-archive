import "server-only";
import { type AutolinkableContent } from "@/lib/autolink";
import { updateCharacterBio } from "@/lib/characters";
import {
  updateMissionSynopsisWithHtml,
  updateMissionLogSourceMd,
} from "@/lib/missions";
import { updateArchiveEntryContent } from "@/lib/archive";
import {
  revalidateCharacter,
  revalidateMission,
  revalidateLog,
  revalidateArchiveEntry,
} from "@/lib/revalidate";

// Speichert einen automatisch verlinkten Inhalt — der gemeinsame Nenner von
// „Alle Inhalte verlinken" (src/app/actions/autolinkAll.ts) und dem
// Nachziehen nach einer Umbenennung (src/lib/autolinkSync.ts). Beide hatten
// dieselbe vierfache Fallunterscheidung; sie steht deshalb nur noch hier.
//
// Bewusst ein eigenes Modul und nicht in autolink.ts: dort liegt die reine
// Verlinkungslogik, hier der Schreibzugriff auf die vier Content-Tabellen.
// Die Datenschicht (characters.ts/missions.ts/archive.ts) darf dieses Modul
// NICHT importieren, sonst entstünde ein Import-Kreis.
export async function saveAutolinkedContent(
  content: Pick<AutolinkableContent, "contentType" | "id" | "slug" | "missionId">,
  sourceMd: string,
  html: string,
  // Wer die Bearbeitung ausgelöst hat — nur für die Versionshistorie. Das
  // automatische Nachziehen kennt keine Person und übergibt null.
  editorId: number | null = null,
): Promise<void> {
  switch (content.contentType) {
    case "character":
      await updateCharacterBio(content.id, sourceMd, html, editorId);
      revalidateCharacter(content.slug);
      break;
    case "mission":
      await updateMissionSynopsisWithHtml(content.id, sourceMd, html, editorId);
      revalidateMission(content.slug);
      break;
    case "missionLog":
      await updateMissionLogSourceMd(content.id, sourceMd, html, editorId);
      if (content.missionId != null) {
        revalidateLog(content.missionId, content.slug);
      }
      break;
    case "archiveEntry":
      await updateArchiveEntryContent(content.id, sourceMd, html, editorId);
      revalidateArchiveEntry(content.slug);
      break;
  }
}
