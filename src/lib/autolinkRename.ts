import { normalizeWikilinkTarget } from "@/lib/slug";

// Reine Textarbeit für das Nachziehen der Verlinkungen nach einer
// Umbenennung — ohne Datenbank und ohne Next, damit sie sich als Einheit
// prüfen lässt. Der Ablauf drumherum (laden, speichern, im Hintergrund
// starten) steht in src/lib/autolinkSync.ts.

export interface AutolinkRenameInput {
  // Welcher Inhalt wurde umbenannt (Autolink-Ziel-Typ, siehe autolink.ts).
  type: "character" | "mission" | "archive";
  slug: string;
  previousName: string;
  previousAliases: string[];
  name: string;
  aliases: string[];
}

// Wikilinks mit allen Bestandteilen: [[Ziel#Abschnitt|Anzeigetext]]. Wie
// WIKILINK_RE in markdown.ts, nur mit Abschnitt und Anzeigetext als eigene
// Gruppen — beide müssen beim Umschreiben erhalten bleiben.
const WIKILINK_PARTS_RE = /\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;

// Schreibt [[Alter Name]] auf [[Neuer Name|Alter Name]] um: das Ziel zeigt
// wieder auf den Inhalt, im Text steht weiterhin das Wort, das dort stand.
// Ein bereits vorhandener Anzeigetext ([[Alter Name|sie]]) bleibt erhalten.
export function retargetWikilinks(
  sourceMd: string,
  from: string,
  to: string,
): { sourceMd: string; retargeted: number } {
  const wanted = normalizeWikilinkTarget(from);
  if (!wanted || normalizeWikilinkTarget(to) === wanted) {
    return { sourceMd, retargeted: 0 };
  }
  let retargeted = 0;
  const next = sourceMd.replace(
    WIKILINK_PARTS_RE,
    (
      full: string,
      rawTarget: string,
      section: string | undefined,
      alias: string | undefined,
    ) => {
      if (normalizeWikilinkTarget(rawTarget) !== wanted) return full;
      retargeted += 1;
      return `[[${to}${section ?? ""}|${alias ?? rawTarget.trim()}]]`;
    },
  );
  return { sourceMd: next, retargeted };
}

// Die Schreibweisen, die es vorher NICHT gab — nur sie werden nachverlinkt
// (siehe Kopfkommentar in autolinkSync.ts). Groß-/Kleinschreibung zählt
// dabei nicht als Unterschied, das Autolinking matcht ohnehin unabhängig
// davon.
export function newPhrasesOf(input: AutolinkRenameInput): string[] {
  const before = new Set(
    [input.previousName, ...input.previousAliases]
      .map((p) => normalizeWikilinkTarget(p))
      .filter(Boolean),
  );
  const seen = new Set<string>();
  return [input.name, ...input.aliases]
    .map((p) => p.trim())
    .filter((p) => {
      const key = normalizeWikilinkTarget(p);
      if (!key || before.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Der Name VOR der Umbenennung — oder null, wenn er derselbe geblieben ist
// und es folglich nichts umzuschreiben gibt.
export function renamedFrom(input: AutolinkRenameInput): string | null {
  return normalizeWikilinkTarget(input.previousName) !==
    normalizeWikilinkTarget(input.name)
    ? input.previousName
    : null;
}

// Hat sich überhaupt etwas geändert, das ein Nachziehen rechtfertigt?
export function needsAutolinkSync(input: AutolinkRenameInput): boolean {
  return renamedFrom(input) !== null || newPhrasesOf(input).length > 0;
}
