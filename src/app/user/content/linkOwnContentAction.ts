"use server";

import { getActiveUser } from "@/lib/dal";
import {
  applyAutolinks,
  getAutolinkTargets,
  getOwnAutolinkableContent,
  renderAutolinkedHtml,
  type AutolinkContentType,
  type AutolinkTarget,
} from "@/lib/autolink";
import { saveAutolinkedContent } from "@/lib/autolinkWrite";

export interface LinkOwnContentBatchResult {
  error?: string;
  total?: number;
  processed?: number;
  changedInBatch?: number;
  linksInBatch?: number;
  done?: boolean;
}

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

// Verlinkt ausschließlich die Inhalte des aktuell angemeldeten Kontos. Der
// aktuelle User und die zu bearbeitenden Inhalte werden bei JEDEM Batch frisch
// serverseitig geladen; Offset und Blockgröße sind die einzigen Clientwerte.
export async function linkOwnContentBatchAction(
  offset: number,
  batchSize: number,
): Promise<LinkOwnContentBatchResult> {
  const user = await getActiveUser();
  if (!user) return { error: "Bitte melde dich an." };

  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const safeBatch =
    Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 100
      ? batchSize
      : 20;

  const [allTargets, contents] = await Promise.all([
    getAutolinkTargets(),
    getOwnAutolinkableContent(user.id),
  ]);

  const total = contents.length;
  const slice = contents.slice(safeOffset, safeOffset + safeBatch);
  let changedInBatch = 0;
  let linksInBatch = 0;

  for (const content of slice) {
    const self = selfKey(content.contentType, content.slug);
    const targets = self
      ? allTargets.filter(
          (target) =>
            !(target.type === self.type && target.slug === self.slug),
        )
      : allTargets;

    const { sourceMd, matches } = applyAutolinks(content.sourceMd, targets);
    if (matches.length === 0) continue;

    const html = await renderAutolinkedHtml(sourceMd, matches);
    await saveAutolinkedContent(content, sourceMd, html);
    changedInBatch += 1;
    linksInBatch += matches.length;
  }

  const processed = Math.min(safeOffset + safeBatch, total);
  return {
    total,
    processed,
    changedInBatch,
    linksInBatch,
    done: processed >= total,
  };
}
