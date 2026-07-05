import "server-only";
import sql from "@/lib/db";
import { markdownToHtml } from "@/lib/markdown";
import { slugifyBase } from "@/lib/slug";

export type AutolinkTargetType = "character" | "mission" | "archive";

export interface AutolinkTarget {
  type: AutolinkTargetType;
  slug: string;
  href: string;
  canonical: string;
  // Namen/Aliase, gegen die im Fließtext gematcht wird — für Charaktere
  // zusätzlich metadata.aliases, für Missionen/Archiv-Einträge nur der Titel.
  phrases: string[];
}

export interface AutolinkMatch {
  type: AutolinkTargetType;
  canonical: string;
  href: string;
  matchedText: string;
}

export interface AutolinkResult {
  sourceMd: string;
  matches: AutolinkMatch[];
}

// Abschnitte, in denen niemals verlinkt werden darf: Codeblöcke/Inline-Code,
// Bilder, bereits vorhandene Wikilinks/Markdown-Links (sonst würde z.B. ein
// Linktext selbst nochmal verlinkt oder eine URL zerschnitten).
const PROTECTED_RE =
  /```[\s\S]*?```|`[^`\n]*`|!\[[^\]]*\]\([^)]*\)|\[\[[^\]]*\]\]|\[[^\]]*\]\([^)]*\)/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Priorität bei Namens-Kollisionen zwischen Typen, analog zu
// scripts/ingest/wikilinks.ts: Charaktere > Archiv-Einträge > Missionen.
const TYPE_PRIORITY: AutolinkTargetType[] = ["character", "archive", "mission"];

// Durchsucht sourceMd nach Erwähnungen bekannter Namen/Aliase (targets) und
// ersetzt JEDE Erwähnung pro Ziel durch einen [[Wikilink]]. [[Ziel]]-Syntax
// statt eines direkten Markdown-Links,
// damit das Ergebnis symmetrisch zum "Wikilinks entfernen"-Feature bleibt
// (siehe src/lib/wikilinkCleanup.ts) — Auflösung zum echten Link passiert
// beim Rendern separat über resolveAutolinkedWikilinks() unten, damit die
// frisch erstellten Links (anders als sonstige, nur beim Vault-Ingest
// aufgelöste Wikilinks) sofort funktionieren. Groß-/Kleinschreibung wird
// beim Matchen ignoriert, aber im Anzeigetext exakt wie im Original
// beibehalten (als Alias, falls er vom Zielnamen abweicht). Wortgrenzen
// per Unicode-Lookaround statt \b, weil \b bei Apostrophen in Namen
// (z.B. "T'Lorexia") nicht zuverlässig ist.
export function applyAutolinks(
  sourceMd: string,
  targets: AutolinkTarget[],
): AutolinkResult {
  const phraseToTarget = new Map<string, AutolinkTarget>();
  const phraseSet = new Set<string>();

  for (const type of TYPE_PRIORITY) {
    for (const target of targets.filter((t) => t.type === type)) {
      for (const raw of target.phrases) {
        const phrase = raw.trim();
        if (phrase.length < 2) continue;
        const key = phrase.toLowerCase();
        if (!phraseToTarget.has(key)) phraseToTarget.set(key, target);
        phraseSet.add(phrase);
      }
    }
  }

  if (phraseSet.size === 0) return { sourceMd, matches: [] };

  const phrases = [...phraseSet].sort((a, b) => b.length - a.length);
  const alternation = phrases
    .map((p) => `(?<![\\p{L}\\p{N}_])${escapeRegExp(p)}(?![\\p{L}\\p{N}_])`)
    .join("|");
  const matchRe = new RegExp(alternation, "giu");

  const protectedRanges: [number, number][] = [];
  PROTECTED_RE.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = PROTECTED_RE.exec(sourceMd))) {
    protectedRanges.push([pm.index, pm.index + pm[0].length]);
  }
  const isProtected = (start: number, end: number) =>
    protectedRanges.some(([s, e]) => start < e && end > s);

  const matches: AutolinkMatch[] = [];
  const parts: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = matchRe.exec(sourceMd))) {
    const start = m.index;
    const end = start + m[0].length;
    const target = phraseToTarget.get(m[0].toLowerCase());
    if (!target || isProtected(start, end)) {
      continue;
    }
    parts.push(sourceMd.slice(lastIndex, start));
    parts.push(
      m[0] === target.canonical
        ? `[[${target.canonical}]]`
        : `[[${target.canonical}|${m[0]}]]`,
    );
    matches.push({
      type: target.type,
      canonical: target.canonical,
      href: target.href,
      matchedText: m[0],
    });
    lastIndex = end;
  }
  parts.push(sourceMd.slice(lastIndex));

  return { sourceMd: parts.join(""), matches };
}

export interface AutolinkExclude {
  type: AutolinkTargetType;
  slug: string;
}

// Alle verlinkbaren Ziele aus der DB — nur öffentlich sichtbare (ein per
// Autolinking gesetzter Link in öffentlichem Inhalt darf nicht auf etwas
// zeigen, das die meisten Leser gar nicht sehen dürfen). Missionen haben
// keine eigene Sichtbarkeits-Sperre. Gespräche (category = 'dialogue')
// werden ausgeschlossen — ihr Titel ist ein generierter Platzhalter, kein
// Name, den jemand im Fließtext erwähnen würde.
export async function getAutolinkTargets(
  exclude?: AutolinkExclude,
): Promise<AutolinkTarget[]> {
  const [characters, missions, archiveEntries] = await Promise.all([
    sql<{ slug: string; name: string; aliases: string[] | null }[]>`
      SELECT slug, name, metadata->'aliases' AS aliases
      FROM characters
      WHERE visibility = 'public'
    `,
    sql<{ slug: string; title: string }[]>`
      SELECT slug, title FROM missions
    `,
    sql<{ slug: string; title: string }[]>`
      SELECT slug, title FROM archive_entries
      WHERE visibility = 'public' AND category != 'dialogue'
    `,
  ]);

  const targets: AutolinkTarget[] = [
    ...characters.map((c) => ({
      type: "character" as const,
      slug: c.slug,
      href: `/characters/${c.slug}`,
      canonical: c.name,
      phrases: [c.name, ...(c.aliases ?? [])],
    })),
    ...archiveEntries.map((a) => ({
      type: "archive" as const,
      slug: a.slug,
      href: `/archive/${a.slug}`,
      canonical: a.title,
      phrases: [a.title],
    })),
    ...missions.map((m) => ({
      type: "mission" as const,
      slug: m.slug,
      href: `/missions/${m.slug}`,
      canonical: m.title,
      phrases: [m.title],
    })),
  ];

  return exclude
    ? targets.filter(
        (t) => !(t.type === exclude.type && t.slug === exclude.slug),
      )
    : targets;
}

function normalizeWikilinkTarget(s: string): string {
  return s.trim().toLowerCase();
}

// rehype-stringify kodiert Apostrophe im href-Attribut als numerische
// HTML-Entity (&#x27;, hex — nicht &#39;, dezimal), was decodeURIComponent
// nicht auflöst. Dieselbe Notwendigkeit wie decodeEntities() in
// scripts/ingest/wikilinks.ts, hier nur auf das eine Zeichen reduziert,
// das bei Namen wie "T'Lorexia" vorkommt.
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// markdownToHtml() rendert [[Ziel]] (siehe remarkWikiLinks in
// lib/markdown.ts) zu <a href="wikilink://Ziel">Text</a> — echte
// Auflösung zum Ziel-Pfad passiert sonst erst beim nächsten Vault-Ingest
// (scripts/ingest/wikilinks.ts). Für die vom Autolinking SELBST gerade
// erstellten Wikilinks kennen wir den echten Pfad aber schon (aus
// matches) und lösen sie hier sofort auf, damit sie unmittelbar nach dem
// Speichern funktionieren statt bis zum nächsten Ingest als "nicht
// gefunden" zu erscheinen. Andere, bereits vorher im Inhalt vorhandene
// Wikilinks bleiben unangetastet (unverändertes Verhalten). Für ALLE
// anderen [[Ziel]]-Wikilinks (manuell getippt, ohne Autolinking-Opt-in)
// siehe resolveAllWikilinks() weiter unten.
export function resolveAutolinkedWikilinks(
  html: string,
  matches: AutolinkMatch[],
): string {
  const hrefByCanonical = new Map(
    matches.map((m) => [normalizeWikilinkTarget(m.canonical), m.href]),
  );
  return html.replace(
    /<a href="wikilink:\/\/([^"]*)">/g,
    (full, rawTarget: string) => {
      const target = normalizeWikilinkTarget(
        decodeHtmlEntities(decodeURIComponent(rawTarget)),
      );
      const href = hrefByCanonical.get(target);
      return href ? `<a href="${href}" class="lcars-wikilink">` : full;
    },
  );
}

// Vollständiger Wikilink-Match (Text dazwischen), nicht nur das öffnende Tag
// wie oben — hier auch für den "nicht gefunden"-Fall nötig, der den ganzen
// Link durch einen Platzhalter-<span> ersetzt (siehe unten).
const WIKILINK_TAG_RE = /<a href="wikilink:\/\/([^"]*)">([\s\S]*?)<\/a>/g;

// Fallback für Ziele wie [[T'Mok]], die nicht dem Titel/Namen entsprechen,
// aber dem Slug (t-mok) — analog dem Fallback in scripts/ingest/wikilinks.ts,
// hier mit slugifyBase() aus src/lib/slug.ts (dieselbe Funktion, die App-
// seitig auch tatsächlich die Slugs erzeugt).
function slugifyForWikilinkFallback(value: string): string {
  return slugifyBase(value);
}

// Löst [[Ziel]]-Wikilinks (siehe remarkWikiLinks in lib/markdown.ts) IMMER
// auf, unabhängig vom Opt-in "Automatisch verlinken" — anders als
// resolveAutolinkedWikilinks oben, das nur die von EINEM Autolinking-Durchlauf
// selbst erzeugten Links kennt (aus dessen matches-Liste). Wer manuell
// [[Ziel]] in einen Text tippt (ohne die Checkbox zu aktivieren), bekam
// bisher einen dauerhaft toten <a href="wikilink://Ziel">-Link, der erst
// beim nächsten Vault-Ingest aufgelöst worden wäre — der aber für
// App-erstellte Inhalte nie stattfindet. Sucht deshalb hier direkt in der
// DB nach ALLEN Zielen (nicht nur öffentlichen wie getAutolinkTargets, siehe
// dort) — ein manuell gesetzter Wikilink ist eine bewusste Nutzer-Aktion,
// keine automatische Erkennung, daher dieselbe Auflösen-gegen-alles-
// Konvention wie scripts/ingest/wikilinks.ts. Nicht auflösbare Ziele werden
// wie beim Ingest als "nicht gefunden"-Platzhalter markiert statt als toter
// Link stehen zu bleiben.
export async function resolveAllWikilinks(html: string): Promise<string> {
  if (!html.includes("wikilink://")) return html;

  const [characters, missions, archiveEntries] = await Promise.all([
    sql<{ slug: string; name: string }[]>`SELECT slug, name FROM characters`,
    sql<{ slug: string; title: string }[]>`SELECT slug, title FROM missions`,
    sql<{ slug: string; title: string }[]>`SELECT slug, title FROM archive_entries`,
  ]);

  // Priorität bei Titel-/Slug-Kollisionen: Charaktere > Archiv-Einträge >
  // Missionen — dieselbe Reihenfolge wie TYPE_PRIORITY oben/beim Ingest.
  const hrefByTitle = new Map<string, string>();
  const hrefBySlug = new Map<string, string>();
  for (const m of missions) {
    hrefByTitle.set(normalizeWikilinkTarget(m.title), `/missions/${m.slug}`);
    hrefBySlug.set(m.slug, `/missions/${m.slug}`);
  }
  for (const a of archiveEntries) {
    hrefByTitle.set(normalizeWikilinkTarget(a.title), `/archive/${a.slug}`);
    hrefBySlug.set(a.slug, `/archive/${a.slug}`);
  }
  for (const c of characters) {
    hrefByTitle.set(normalizeWikilinkTarget(c.name), `/characters/${c.slug}`);
    hrefBySlug.set(c.slug, `/characters/${c.slug}`);
  }

  return html.replace(WIKILINK_TAG_RE, (full, rawTarget: string, text: string) => {
    const target = decodeHtmlEntities(decodeURIComponent(rawTarget));
    const href =
      hrefByTitle.get(normalizeWikilinkTarget(target)) ??
      hrefBySlug.get(slugifyForWikilinkFallback(target));
    if (!href) {
      return `<span class="lcars-wikilink lcars-wikilink--missing" title="Kein Eintrag gefunden: ${target}">${text}</span>`;
    }
    return `<a href="${href}" class="lcars-wikilink">${text}</a>`;
  });
}

// Rendert Markdown zu HTML UND löst darin enthaltene Wikilinks auf — der
// Standard-Rendering-Pfad für alle Content-Schreibaktionen, die nicht schon
// über das Autolinking-Opt-in ein fertig aufgelöstes HTML mitbringen (siehe
// contentHtml/bodyHtml/bioHtml-Parameter in missions.ts/archive.ts/
// characters.ts). Ersetzt die bisherigen nackten markdownToHtml()-Aufrufe
// dort, die [[Ziel]]-Wikilinks sonst dauerhaft unaufgelöst gelassen hätten.
export async function renderContentHtml(bodyMarkdown: string): Promise<string> {
  return resolveAllWikilinks(await markdownToHtml(bodyMarkdown));
}

// Für das Opt-in "Automatisch verlinken" unter den Content-Textareas (New/
// Edit-Formulare + Inline-Editoren): wendet Autolinking auf einen noch
// nicht gespeicherten Markdown-Text an und liefert sourceMd + sofort
// aufgelöstes HTML — gleiches Muster wie planAutolink() in
// src/app/actions/contentTools.ts, nur für frischen Text statt einen schon
// gespeicherten Inhalt (daher hier, nicht dort: contentTools.ts ist
// admin-only, dieser Helfer wird von allen Content-Aktionen genutzt).
export async function autoLinkMarkdown(
  bodyMarkdown: string,
  exclude?: AutolinkExclude,
): Promise<{ sourceMd: string; html: string }> {
  const targets = await getAutolinkTargets(exclude);
  const { sourceMd, matches } = applyAutolinks(bodyMarkdown, targets);
  const html = resolveAutolinkedWikilinks(
    await markdownToHtml(sourceMd),
    matches,
  );
  return { sourceMd, html };
}
