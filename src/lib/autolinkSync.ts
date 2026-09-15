import "server-only";
import { after } from "next/server";
import {
  applyAutolinks,
  getAutolinkTargets,
  getAllAutolinkableContent,
  renderContentHtml,
  type AutolinkContentType,
  type AutolinkTarget,
} from "@/lib/autolink";
import {
  needsAutolinkSync,
  newPhrasesOf,
  renamedFrom,
  retargetWikilinks,
  type AutolinkRenameInput,
} from "@/lib/autolinkRename";
import { saveAutolinkedContent } from "@/lib/autolinkWrite";
import { logCaughtError } from "@/lib/errorLog";

// Nachziehen der Verlinkungen, wenn ein Inhalt umbenannt wird oder neue
// Aliase bekommt.
//
// Bis hierher galt: verlinkt wird beim Schreiben eines Textes (Opt-in
// „Automatisch verlinken") oder auf Knopfdruck über das Admin-Werkzeug
// „Alle Inhalte verlinken". Ein Name, der erst SPÄTER entsteht, blieb
// deshalb in allen älteren Texten unverlinkt — heißt ein NPC ab sofort auch
// „Wirtin Sareth", stand das Wort in zwanzig Logbüchern, ohne irgendwohin zu
// führen.
//
// Zwei Dinge passieren deshalb im Hintergrund (after(), also nach der
// Antwort — das Speichern-Formular wartet nicht darauf), sobald sich Name/
// Titel oder Aliase eines Inhalts ändern:
//
//   1. Neue Schreibweisen werden in allen anderen Inhalten verlinkt. Bewusst
//      NUR die neuen: eine Umbenennung soll nicht nachträglich jede seit
//      jeher bekannte Schreibweise überall verlinken — das wäre eine
//      Massenänderung, die niemand angefordert hat (dafür gibt es das
//      Admin-Werkzeug „Alle Inhalte verlinken").
//   2. Bestehende [[Wikilinks]] auf den ALTEN Namen werden auf den neuen
//      umgeschrieben (der Anzeigetext bleibt, was dastand). Ohne das zeigte
//      jeder vorhandene Link nach einer Umbenennung ins Leere — der Renderer
//      löst Wikilinks über den Titel auf (siehe resolveAllWikilinks in
//      autolink.ts), und den gibt es dann nicht mehr.
//
// Gespeichert wird nur, was sich tatsächlich ändert; jede Änderung landet
// wie jede andere Bearbeitung in der Versionshistorie (ohne Person, siehe
// saveAutolinkedContent).

export interface AutolinkSyncResult {
  // Wie viele Inhalte geändert und gespeichert wurden.
  changed: number;
  // Neu gesetzte Verlinkungen bzw. auf den neuen Namen umgeschriebene Links.
  links: number;
  retargeted: number;
}

// Der umbenannte Inhalt selbst darf sich nicht verlinken — Zuordnung der
// Ziel-Typen auf die Content-Typen mit Markdown-Quelltext.
function isSelf(
  contentType: AutolinkContentType,
  slug: string,
  input: AutolinkRenameInput,
): boolean {
  if (slug !== input.slug) return false;
  switch (input.type) {
    case "character":
      return contentType === "character";
    case "mission":
      return contentType === "mission";
    case "archive":
      return contentType === "archiveEntry";
  }
}

// Die eigentliche Arbeit — getrennt von der Hintergrund-Planung unten, damit
// sie sich im Integrationstest direkt aufrufen (und abwarten) lässt.
export async function runAutolinkSync(
  input: AutolinkRenameInput,
): Promise<AutolinkSyncResult> {
  const empty: AutolinkSyncResult = { changed: 0, links: 0, retargeted: 0 };
  if (!needsAutolinkSync(input)) return empty;

  const from = renamedFrom(input);
  const phrases = newPhrasesOf(input);

  // Das Ziel kommt aus getAutolinkTargets(), damit dieselben Regeln gelten
  // wie beim normalen Autolinking: Entwürfe, gelöschte Inhalte und Gespräche
  // sind kein Ziel. Ist der Inhalt kein Ziel (z.B. noch ein Entwurf), bleibt
  // nur das Umschreiben vorhandener Links — die zeigen sonst ins Leere.
  const allTargets = await getAutolinkTargets();
  const self = allTargets.find(
    (t) => t.type === input.type && t.slug === input.slug,
  );
  const target: AutolinkTarget | null =
    self && phrases.length > 0 ? { ...self, phrases } : null;

  if (!target && !from) return empty;

  const contents = await getAllAutolinkableContent();
  const result: AutolinkSyncResult = { changed: 0, links: 0, retargeted: 0 };

  for (const content of contents) {
    if (isSelf(content.contentType, content.slug, input)) continue;

    let sourceMd = content.sourceMd;
    let retargeted = 0;
    if (from) {
      const retarget = retargetWikilinks(sourceMd, from, input.name);
      sourceMd = retarget.sourceMd;
      retargeted = retarget.retargeted;
    }

    // applyAutolinks lässt bestehende [[Wikilinks]] unangetastet (sie zählen
    // zu den geschützten Bereichen), die eben umgeschriebenen also auch.
    const linked = target
      ? applyAutolinks(sourceMd, [target])
      : { sourceMd, matches: [] };
    if (linked.sourceMd === content.sourceMd) continue;

    await saveAutolinkedContent(
      content,
      linked.sourceMd,
      await renderContentHtml(linked.sourceMd),
    );
    result.changed += 1;
    result.links += linked.matches.length;
    result.retargeted += retargeted;
  }

  return result;
}

// Fire-and-forget aus einer Server Action heraus: der Lauf hängt sich per
// after() an die fertige Antwort, damit das Formular nicht auf ihn wartet
// (gleiche Linie wie syncEmbeddings in embeddingSync.ts — Fehler werden
// geloggt, nie in den Aufrufer zurückgeworfen). Außerhalb eines Requests —
// etwa in Skripten oder Tests — gibt es kein after(); dann läuft der Sync
// ohne diese Klammer.
export function syncAutolinksAfterRename(input: AutolinkRenameInput): void {
  if (!needsAutolinkSync(input)) return;

  const run = () =>
    runAutolinkSync(input).catch((err) =>
      logCaughtError(err, `autolinkSync:${input.type}:${input.slug}`),
    );

  try {
    after(run);
  } catch {
    void run();
  }
}

export type { AutolinkRenameInput };
