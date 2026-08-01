// Reine, DB-/React-freie Logik hinter dem Story-Graph der Timeline: Auflösung
// der internen Verlinkungen (Wikilinks) zu Kanten sowie Jahres-Helfer. Getestet
// in storyGraphFormat.test.ts; die DB-Orchestrierung lebt in storyGraph.ts.
import { WIKILINK_RE } from "@/lib/markdown";
import { slugifyBase } from "@/lib/slug";
import type { StoryEdge, YearRange } from "@/types/storyGraph";

// Jahr aus einem ISO-Datum (YYYY-… ) — null bei fehlend/ungültig.
export function yearFromIso(value: string | null | undefined): number | null {
  if (!value) return null;
  const year = Number(String(value).slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function normalizeTarget(value: string): string {
  return value.trim().toLowerCase();
}

// Lookup-Eintrag je Knoten für die Wikilink-Auflösung: dessen ID plus die
// Titel/Namen (inkl. Aliase), gegen die ein [[Ziel]] matchen kann, sowie der
// Slug (Fallback wie beim Vault-Ingest / resolveAllWikilinks).
export interface EdgeLookupEntry {
  id: string;
  slug: string;
  titles: string[];
}

// Baut die gerichteten Story-Kanten:
//   1. aus den [[Wikilinks]] im source_md jedes Knotens (Ziel per Titel/Name,
//      sonst per Slug aufgelöst — dieselbe Konvention wie resolveAllWikilinks
//      in autolink.ts),
//   2. plus vorab bekannte Kanten (extraEdges, z.B. archive_links).
// Dedupliziert (source→target einmalig), ohne Selbstkanten; extraEdges werden
// nur übernommen, wenn beide Endpunkte existierende Knoten sind. Bei Titel-/
// Slug-Kollisionen gewinnt der zuerst einsortierte Eintrag — der Aufrufer
// ordnet lookup daher nach Priorität (Charaktere > Archiv > Missionen, analog
// TYPE_PRIORITY in autolink.ts).
export function buildStoryEdges(
  lookup: EdgeLookupEntry[],
  sourceMdById: Map<string, string | null>,
  extraEdges: StoryEdge[] = [],
): StoryEdge[] {
  const ids = new Set(lookup.map((e) => e.id));
  const titleToId = new Map<string, string>();
  const slugToId = new Map<string, string>();
  for (const entry of lookup) {
    if (!slugToId.has(entry.slug)) slugToId.set(entry.slug, entry.id);
    for (const title of entry.titles) {
      const key = normalizeTarget(title);
      if (key && !titleToId.has(key)) titleToId.set(key, entry.id);
    }
  }

  const seen = new Set<string>();
  const edges: StoryEdge[] = [];
  const add = (source: string, target: string, label?: string) => {
    if (source === target) return;
    if (!ids.has(source) || !ids.has(target)) return;
    const key = `${source}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(label ? { source, target, label } : { source, target });
  };

  for (const entry of lookup) {
    const md = sourceMdById.get(entry.id);
    if (!md) continue;
    WIKILINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WIKILINK_RE.exec(md))) {
      const rawTarget = m[1].trim();
      if (!rawTarget) continue;
      const targetId =
        titleToId.get(normalizeTarget(rawTarget)) ??
        slugToId.get(slugifyBase(rawTarget));
      if (targetId) add(entry.id, targetId);
    }
  }

  for (const extra of extraEdges) add(extra.source, extra.target, extra.label);

  return edges;
}

// Globaler Jahres-Bereich (Regler-Grenzen) aus allen vorkommenden Jahren.
// null, wenn keine Jahre vorhanden sind.
export function computeYearRange(years: number[]): YearRange | null {
  let min = Infinity;
  let max = -Infinity;
  for (const y of years) {
    if (!Number.isFinite(y)) continue;
    if (y < min) min = y;
    if (y > max) max = y;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}
