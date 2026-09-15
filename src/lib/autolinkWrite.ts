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

// Next wirft in revalidateTag eine Invariante ("static generation store
// missing", Fehlercode E263), wenn es außerhalb eines Requests gerufen wird.
// Beim Bulk-Werkzeug passiert das nie (Server Action), beim Nachziehen nach
// einer Umbenennung schon: der Lauf hängt zwar per after() an einer Antwort,
// läuft aber in Tests und Skripten auch ganz ohne Request — und dort gibt es
// auch keinen Cache, der zu leeren wäre. Genau dieser Fall wird deshalb
// verschluckt; jeder andere Fehler fliegt weiter.
function isMissingRequestScope(err: unknown): boolean {
  const code = (err as { __NEXT_ERROR_CODE?: string } | null)?.__NEXT_ERROR_CODE;
  if (code === "E263") return true;
  return (
    err instanceof Error && err.message.includes("static generation store")
  );
}

function revalidateIfInRequest(revalidate: () => void): void {
  try {
    revalidate();
  } catch (err) {
    if (!isMissingRequestScope(err)) throw err;
  }
}

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
      revalidateIfInRequest(() => revalidateCharacter(content.slug));
      break;
    case "mission":
      await updateMissionSynopsisWithHtml(content.id, sourceMd, html, editorId);
      revalidateIfInRequest(() => revalidateMission(content.slug));
      break;
    case "missionLog": {
      await updateMissionLogSourceMd(content.id, sourceMd, html, editorId);
      const missionId = content.missionId;
      if (missionId != null) {
        revalidateIfInRequest(() => revalidateLog(missionId, content.slug));
      }
      break;
    }
    case "archiveEntry":
      await updateArchiveEntryContent(content.id, sourceMd, html, editorId);
      revalidateIfInRequest(() => revalidateArchiveEntry(content.slug));
      break;
  }
}
