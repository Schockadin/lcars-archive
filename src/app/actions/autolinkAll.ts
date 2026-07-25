"use server";
import { requireAdmin } from "@/lib/dal";
import {
  applyAutolinks,
  getAutolinkTargets,
  getAllAutolinkableContent,
  resolveAutolinkedWikilinks,
  type AutolinkContentType,
  type AutolinkTarget,
} from "@/lib/autolink";
import { markdownToHtml } from "@/lib/markdown";
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

export interface LinkAllContentState {
  error?: string;
  // Bei Erfolg gesetzt: Anzahl geänderter Inhalte (mindestens ein neuer Link),
  // Gesamtzahl gesetzter Verknüpfungen und Gesamtzahl geprüfter Inhalte.
  changedCount?: number;
  linkCount?: number;
  totalScanned?: number;
}

// Self-Ausschluss: ein Inhalt darf nicht auf sich selbst verlinken.
// Mission-Logs sind selbst kein Autolink-Ziel (siehe getAutolinkTargets) und
// brauchen deshalb keinen Ausschluss.
function selfKey(
  contentType: AutolinkContentType,
  slug: string,
): { type: AutolinkTarget["type"]; slug: string } | null {
  switch (contentType) {
    case "character":
      return { type: "character", slug };
    case "mission":
      return { type: "mission", slug };
    case "archiveEntry":
      return { type: "archive", slug };
    case "missionLog":
      return null;
  }
}

// Admin-only Bulk-Werkzeug (/admin/scripts): wendet Autolinking auf ALLE
// bestehenden Inhalte an (Charaktere, Missionen, Mission-Logs, Archiv-
// Einträge). Dieselbe Erkennung/Auflösung wie das per-Inhalt-Werkzeug
// (contentTools.ts / planAutolink) — hier nur einmal die Ziel-Liste laden und
// pro Inhalt in-memory den Selbst-Bezug ausschließen, statt sie für jeden
// Inhalt neu aus der DB zu holen. Speichert nur Inhalte, bei denen tatsächlich
// mindestens ein neuer [[Wikilink]] entsteht.
export async function linkAllContentAction(
  _state: LinkAllContentState,
  _formData: FormData,
): Promise<LinkAllContentState> {
  await requireAdmin();

  const [allTargets, contents] = await Promise.all([
    getAutolinkTargets(),
    getAllAutolinkableContent(),
  ]);

  let changedCount = 0;
  let linkCount = 0;

  for (const content of contents) {
    const self = selfKey(content.contentType, content.slug);
    const targets = self
      ? allTargets.filter(
          (t) => !(t.type === self.type && t.slug === self.slug),
        )
      : allTargets;

    const { sourceMd, matches } = applyAutolinks(content.sourceMd, targets);
    if (matches.length === 0) continue;

    const html = resolveAutolinkedWikilinks(
      await markdownToHtml(sourceMd),
      matches,
    );

    switch (content.contentType) {
      case "character":
        await updateCharacterBio(content.id, sourceMd, html);
        revalidateCharacter(content.slug);
        break;
      case "mission":
        await updateMissionSynopsisWithHtml(content.id, sourceMd, html);
        revalidateMission(content.slug);
        break;
      case "missionLog":
        await updateMissionLogSourceMd(content.id, sourceMd, html);
        if (content.missionId != null) {
          revalidateLog(content.missionId, content.slug);
        }
        break;
      case "archiveEntry":
        await updateArchiveEntryContent(content.id, sourceMd, html);
        revalidateArchiveEntry(content.slug);
        break;
    }

    changedCount += 1;
    linkCount += matches.length;
  }

  return { changedCount, linkCount, totalScanned: contents.length };
}
