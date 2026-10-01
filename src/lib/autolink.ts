import "server-only";
import sql from "@/lib/db";
import { markdownToHtml } from "@/lib/markdown";
import { slugifyBase, normalizeWikilinkTarget } from "@/lib/slug";
import { isRangeProtected, type ProtectedRange } from "@/lib/protectedRanges";
import { aliasGenitives } from "@/lib/autolinkPhrases";
import {
  archiveHref,
  characterHref,
  missionHref,
} from "@/lib/contentRoutes";

export type AutolinkTargetType = "character" | "mission" | "archive";

export interface AutolinkTarget {
  type: AutolinkTargetType;
  slug: string;
  href: string;
  canonical: string;
  // Namen/Aliase, gegen die im Fließtext gematcht wird — für Charaktere
  // zusätzlich metadata.aliases — dasselbe gilt seit v1.34 für
  // Datenbank-Einträge; für Missionen nur der Titel.
  phrases: string[];
  // Aus Aliases abgeleitete Genitivformen; explizite Ziele/Aliases haben
  // Vorrang, falls eine solche Form mit einem echten Namen kollidiert.
  genitives?: string[];
  preview?: string | null;
}

export interface AutolinkMatch {
  type: AutolinkTargetType;
  canonical: string;
  href: string;
  matchedText: string;
  preview?: string;
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
  for (const type of TYPE_PRIORITY) {
    for (const target of targets.filter((t) => t.type === type)) {
      for (const raw of target.genitives ?? []) {
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

  const protectedRanges: ProtectedRange[] = [];
  PROTECTED_RE.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = PROTECTED_RE.exec(sourceMd))) {
    protectedRanges.push([pm.index, pm.index + pm[0].length]);
  }
  // Bereiche aufsteigend/nicht überlappend (links→rechts-RegExp) — Binärsuche
  // statt linearer .some()-Prüfung je Kandidaten-Treffer.
  const isProtected = (start: number, end: number) =>
    isRangeProtected(protectedRanges, start, end);

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
      ...(target.preview ? { preview: target.preview } : {}),
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
// keine eigene Sichtbarkeits-Sperre; gelöscht sind sie aber auch hier kein
// Ziel — getMissionBySlug lädt nur mit `deleted_at IS NULL`, ein Link darauf
// liefe also ins Leere (dieselbe Regel wie in resolveAllWikilinks unten).
// Gespräche (category = 'dialogue') werden ausgeschlossen — ihr Titel ist ein
// generierter Platzhalter, kein Name, den jemand im Fließtext erwähnen würde.
export async function getAutolinkTargets(
  exclude?: AutolinkExclude,
): Promise<AutolinkTarget[]> {
  const [characters, missions, archiveEntries] = await Promise.all([
    sql<{ slug: string; name: string; aliases: string[] | null; source_md: string | null; bio: string | null }[]>`
      SELECT slug, name, metadata->'aliases' AS aliases, source_md, bio
      FROM characters
      WHERE is_draft = false AND deleted_at IS NULL
    `,
    sql<{ slug: string; title: string; source_md: string | null }[]>`
      SELECT slug, title, source_md FROM missions WHERE deleted_at IS NULL AND is_draft = false
    `,
    sql<{ slug: string; title: string; aliases: string[] | null; source_md: string | null; summary: string | null }[]>`
      SELECT slug, title, metadata->'aliases' AS aliases, source_md,
             metadata->>'summary' AS summary
      FROM archive_entries
      WHERE is_draft = false AND deleted_at IS NULL AND category != 'dialogue'
    `,
  ]);

  const targets: AutolinkTarget[] = [
    ...characters.map((c) => ({
      type: "character" as const,
      slug: c.slug,
      href: characterHref(c.slug),
      canonical: c.name,
      phrases: [c.name, ...(c.aliases ?? [])],
      genitives: aliasGenitives(c.aliases ?? []),
      preview: previewText(c.bio || c.source_md),
    })),
    ...archiveEntries.map((a) => ({
      type: "archive" as const,
      slug: a.slug,
      href: archiveHref(a.slug),
      canonical: a.title,
      phrases: [a.title, ...(a.aliases ?? [])],
      genitives: aliasGenitives(a.aliases ?? []),
      preview: previewText(a.summary || a.source_md),
    })),
    ...missions.map((m) => ({
      type: "mission" as const,
      slug: m.slug,
      href: missionHref(m.slug),
      canonical: m.title,
      phrases: [m.title],
      preview: previewText(m.source_md),
    })),
  ];

  return exclude
    ? targets.filter(
        (t) => !(t.type === exclude.type && t.slug === exclude.slug),
      )
    : targets;
}

// Inhaltstyp für das Bulk-Autolinking (admin-only "Alle Inhalte verlinken",
// siehe src/app/actions/autolinkAll.ts). Deckt genau die vier Inhaltstypen
// mit rohem Markdown-Body ab (Gespräche haben keinen source_md und sind kein
// Autolink-Ziel, siehe getAutolinkTargets).
export type AutolinkContentType =
  | "character"
  | "mission"
  | "missionLog"
  | "archiveEntry";

export interface AutolinkableContent {
  contentType: AutolinkContentType;
  id: number;
  slug: string;
  // Für die Revalidierung nach dem Speichern (Mission-Log braucht zusätzlich
  // die Mission-ID, siehe revalidateLog).
  missionId: number | null;
  sourceMd: string;
}

// Alle Inhalte mit rohem Markdown-Quelltext (source_md) — Grundlage für das
// Bulk-Autolinking. Nur Inhalte mit tatsächlichem Text (source_md IS NOT NULL
// / != ''); Gespräche (category = 'dialogue') sind ausgeschlossen (kein
// source_md). Bewusst OHNE Sichtbarkeits-/Draft-Filter: das Werkzeug ist
// admin-only und soll alle Inhalte verlinken, nicht nur öffentliche.
export async function getAllAutolinkableContent(): Promise<
  AutolinkableContent[]
> {
  const [characters, missions, logs, archiveEntries] = await Promise.all([
    sql<{ id: number; slug: string; source_md: string }[]>`
      SELECT id, slug, source_md FROM characters
      WHERE source_md IS NOT NULL AND source_md <> '' AND deleted_at IS NULL
      ORDER BY id
    `,
    sql<{ id: number; slug: string; source_md: string }[]>`
      SELECT id, slug, source_md FROM missions
      WHERE source_md IS NOT NULL AND source_md <> '' AND deleted_at IS NULL
      ORDER BY id
    `,
    sql<{ id: number; slug: string; mission_id: number; source_md: string }[]>`
      SELECT id, slug, mission_id, source_md FROM mission_logs
      WHERE source_md IS NOT NULL AND source_md <> '' AND deleted_at IS NULL
      ORDER BY id
    `,
    sql<{ id: number; slug: string; source_md: string }[]>`
      SELECT id, slug, source_md FROM archive_entries
      WHERE source_md IS NOT NULL AND source_md <> ''
        AND category <> 'dialogue' AND deleted_at IS NULL
      ORDER BY id
    `,
  ]);

  return [
    ...characters.map((c) => ({
      contentType: "character" as const,
      id: c.id,
      slug: c.slug,
      missionId: null,
      sourceMd: c.source_md,
    })),
    ...missions.map((m) => ({
      contentType: "mission" as const,
      id: m.id,
      slug: m.slug,
      missionId: null,
      sourceMd: m.source_md,
    })),
    ...logs.map((l) => ({
      contentType: "missionLog" as const,
      id: l.id,
      slug: l.slug,
      missionId: l.mission_id,
      sourceMd: l.source_md,
    })),
    ...archiveEntries.map((a) => ({
      contentType: "archiveEntry" as const,
      id: a.id,
      slug: a.slug,
      missionId: null,
      sourceMd: a.source_md,
    })),
  ];
}

// Alle autolinkfähigen Inhalte, die dem angemeldeten Konto gehören — für
// „Alles verlinken“ unter /user/content. Die Ownership wird hier serverseitig
// und je Inhaltstyp geprüft; der Client übergibt weder eine User-ID noch
// einzelne Inhalts-IDs. Gespräche sind Archiv-Einträge ohne Markdown-Body und
// werden ausdrücklich ausgeschlossen.
export async function getOwnAutolinkableContent(
  userId: number,
): Promise<AutolinkableContent[]> {
  const [characters, missions, logs, archiveEntries] = await Promise.all([
    sql<{ id: number; slug: string; source_md: string }[]>`
      SELECT id, slug, source_md FROM characters
      WHERE player_id = ${userId} AND source_md IS NOT NULL AND source_md <> ''
        AND deleted_at IS NULL
      ORDER BY id
    `,
    sql<{ id: number; slug: string; source_md: string }[]>`
      SELECT id, slug, source_md FROM missions
      WHERE owner_user_id = ${userId} AND source_md IS NOT NULL AND source_md <> ''
        AND deleted_at IS NULL
      ORDER BY id
    `,
    sql<{ id: number; slug: string; mission_id: number; source_md: string }[]>`
      SELECT id, slug, mission_id, source_md FROM mission_logs
      WHERE owner_user_id = ${userId} AND source_md IS NOT NULL AND source_md <> ''
        AND deleted_at IS NULL
      ORDER BY id
    `,
    sql<{ id: number; slug: string; source_md: string }[]>`
      SELECT id, slug, source_md FROM archive_entries
      WHERE owner_user_id = ${userId} AND source_md IS NOT NULL AND source_md <> ''
        AND category <> 'dialogue' AND deleted_at IS NULL
      ORDER BY id
    `,
  ]);

  return [
    ...characters.map((c) => ({
      contentType: "character" as const,
      id: c.id,
      slug: c.slug,
      missionId: null,
      sourceMd: c.source_md,
    })),
    ...missions.map((m) => ({
      contentType: "mission" as const,
      id: m.id,
      slug: m.slug,
      missionId: null,
      sourceMd: m.source_md,
    })),
    ...logs.map((l) => ({
      contentType: "missionLog" as const,
      id: l.id,
      slug: l.slug,
      missionId: l.mission_id,
      sourceMd: l.source_md,
    })),
    ...archiveEntries.map((a) => ({
      contentType: "archiveEntry" as const,
      id: a.id,
      slug: a.slug,
      missionId: null,
      sourceMd: a.source_md,
    })),
  ];
}

// Weiterhin von hier aus verfügbar (die Auflösung der Wikilinks ist das
// Thema dieses Moduls), die Funktion selbst steht in slug.ts.
export { normalizeWikilinkTarget };

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
  const matchByCanonical = new Map(
    matches.map((m) => [normalizeWikilinkTarget(m.canonical), m]),
  );
  return html.replace(
    /<a href="wikilink:\/\/([^"]*)">/g,
    (full, rawTarget: string) => {
      const target = normalizeWikilinkTarget(
        decodeHtmlEntities(decodeURIComponent(rawTarget)),
      );
      const match = matchByCanonical.get(target);
      if (!match) return full;
      const preview = match.preview
        ? ` data-preview="${escapeAttribute(match.preview)}" title="${escapeAttribute(match.preview)}"`
        : "";
      return `<a href="${escapeAttribute(match.href)}" class="lcars-wikilink"${preview}>`;
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

  // Gelöschte Inhalte bleiben in der Tabelle stehen (Papierkorb, siehe
  // /admin/content/trash), ihre Detailseiten laden aber nur mit
  // `deleted_at IS NULL` — ein Wikilink darauf führte ins Leere. Solche Ziele
  // gelten deshalb als nicht gefunden, nicht als Link.
  const [characters, missions, archiveEntries] = await Promise.all([
    sql<{ slug: string; name: string; aliases: string[] | null; source_md: string | null; bio: string | null }[]>`
      SELECT slug, name, metadata->'aliases' AS aliases,
             CASE WHEN NOT is_draft THEN source_md END AS source_md,
             CASE WHEN NOT is_draft THEN bio END AS bio
      FROM characters WHERE deleted_at IS NULL`,
    sql<{ slug: string; title: string; source_md: string | null }[]>`
      SELECT slug, title, CASE WHEN NOT is_draft THEN source_md END AS source_md
      FROM missions WHERE deleted_at IS NULL`,
    sql<{ slug: string; title: string; aliases: string[] | null; source_md: string | null; summary: string | null }[]>`
      SELECT slug, title, metadata->'aliases' AS aliases,
             CASE WHEN NOT is_draft AND category != 'dialogue' THEN source_md END AS source_md,
             CASE WHEN NOT is_draft AND category != 'dialogue' THEN metadata->>'summary' END AS summary
      FROM archive_entries WHERE deleted_at IS NULL`,
  ]);

  // Priorität bei Titel-/Slug-Kollisionen: Charaktere > Archiv-Einträge >
  // Missionen — dieselbe Reihenfolge wie TYPE_PRIORITY oben/beim Ingest.
  const lookup = emptyLookup();
  for (const m of missions) {
    addToLookup(lookup, missionHref(m.slug), m.slug, m.title, null, previewText(m.source_md));
  }
  for (const a of archiveEntries) {
    addToLookup(lookup, archiveHref(a.slug), a.slug, a.title, a.aliases, previewText(a.summary || a.source_md));
  }
  for (const c of characters) {
    addToLookup(lookup, characterHref(c.slug), c.slug, c.name, c.aliases, previewText(c.bio || c.source_md));
  }

  return replaceWikilinkTags(html, (target) => {
    const href = hrefFromLookup(lookup, target);
    return href
      ? {
          href,
          preview: lookup.byPreview.get(href) ?? null,
        }
      : undefined;
  });
}

// Die Nachschlagetabellen beider Auflöser: Titel/Name, Slug und Zweitnamen.
interface WikilinkLookup {
  byTitle: Map<string, string>;
  bySlug: Map<string, string>;
  byAlias: Map<string, string>;
  byPreview: Map<string, string | null>;
}

function emptyLookup(): WikilinkLookup {
  return { byTitle: new Map(), bySlug: new Map(), byAlias: new Map(), byPreview: new Map() };
}

function addToLookup(
  lookup: WikilinkLookup,
  href: string,
  slug: string,
  title: string,
  aliases: string[] | null,
  preview: string | null = null,
): void {
  const titleKey = normalizeWikilinkTarget(title);
  lookup.byTitle.set(titleKey, href);
  lookup.byPreview.set(href, preview);
  lookup.bySlug.set(slug, href);
  for (const alias of aliases ?? []) {
    if (typeof alias !== "string") continue;
    const key = normalizeWikilinkTarget(alias);
    if (key) {
      lookup.byAlias.set(key, href);
    }
  }
}

// Titel, dann Slug, dann Zweitname. Die Zweitnamen kommen zuletzt, damit ein
// echter Titel immer gegen den Zweitnamen eines anderen Eintrags gewinnt.
//
// Dass sie überhaupt zählen, ist der Sinn der Sache: Im Fließtext verlinkt
// applyAutolinks einen Zweitnamen automatisch (phrases umfasst die Aliase) —
// wer denselben Namen ausdrücklich in [[Klammern]] setzt, bekam dagegen
// „Kein Eintrag gefunden". Das war genau andersherum, als man es erwartet.
// Der Vault-Ingest (scripts/ingest/wikilinks.ts) kennt die Aliase nicht; er
// läuft gegen die Obsidian-Dateien, in denen Obsidian selbst schon auflöst.
function hrefFromLookup(
  lookup: WikilinkLookup,
  target: string,
): string | undefined {
  return (
    lookup.byTitle.get(normalizeWikilinkTarget(target)) ??
    lookup.bySlug.get(slugifyForWikilinkFallback(target)) ??
    lookup.byAlias.get(normalizeWikilinkTarget(target))
  );
}

// Wie resolveAllWikilinks, aber ausschließlich gegen die ÖFFENTLICHEN Ziele
// (getAutolinkTargets: keine Entwürfe, keine gelöschten Inhalte, keine
// Gespräche) — für die Vorschau im Editor (renderMarkdownPreview), die ohne
// Anmeldung aufrufbar ist und deshalb nicht verraten darf, welche Entwürfe es
// gibt. Was sie auflöst, steht ohnehin in den öffentlichen Listen. Ein
// Verweis auf den eigenen, noch nicht veröffentlichten Entwurf erscheint in
// der Vorschau folglich als „nicht gefunden" und wird beim Speichern (dort
// gilt resolveAllWikilinks) zum Link.
export async function resolvePublicWikilinks(html: string): Promise<string> {
  if (!html.includes("wikilink://")) return html;

  const targets = await getAutolinkTargets();
  const lookup = emptyLookup();
  // Rückwärts durch die Prioritätenliste, damit der höchstpriorisierte Typ
  // zuletzt schreibt und damit gewinnt — wie in resolveAllWikilinks.
  for (const type of [...TYPE_PRIORITY].reverse()) {
    for (const target of targets.filter((t) => t.type === type)) {
      addToLookup(
        lookup,
        target.href,
        target.slug,
        target.canonical,
        // phrases = kanonischer Name + Aliase; der kanonische Name steht
        // ohnehin schon in byTitle.
        target.phrases.filter((p) => p !== target.canonical),
        target.preview,
      );
    }
  }

  return replaceWikilinkTags(html, (target) => {
    const href = hrefFromLookup(lookup, target);
    return href
      ? {
          href,
          preview: lookup.byPreview.get(href) ?? null,
        }
      : undefined;
  });
}

function previewText(source: string | null | undefined): string | null {
  if (!source) return null;
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[[^\]]*\]\]/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 220) : null;
}

// Ergaenzt Vorschauen bei bereits gespeichertem HTML. Der erste Renderer
// kann data-preview nur bei neu aufgeloesten Wikilinks setzen; alte Vault-
// Imports enthalten dagegen schon direkte hrefs. Es werden ausschliesslich
// die im HTML referenzierten, veroeffentlichten Ziele nachgeladen.
export async function addStoredContentLinkPreviews(html: string): Promise<string> {
  const slugs = { characters: new Set<string>(), archive: new Set<string>() };
  const hrefs = new Map<string, { type: "characters" | "archive"; slug: string }>();

  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
    const href = match[1].replace(/&amp;/g, "&");
    const target = href.match(
      /^\/(characters|archive)\/([a-z0-9-]+)(?:\/(?:sheet|logs))?(?:[?#].*)?$/i,
    );
    if (!target) continue;
    const type = target[1].toLowerCase() as "characters" | "archive";
    const slug = target[2];
    slugs[type].add(slug);
    hrefs.set(href, { type, slug });
  }

  if (hrefs.size === 0) return html;

  const [characters, archiveEntries] = await Promise.all([
    slugs.characters.size > 0
      ? sql<
          { slug: string; name: string; bio: string | null; source_md: string | null }[]
        >`
          SELECT slug, name, bio, source_md FROM characters
          WHERE slug = ANY(${[...slugs.characters]})
            AND is_draft = false AND deleted_at IS NULL
        `
      : Promise.resolve([]),
    slugs.archive.size > 0
      ? sql<
          {
            slug: string;
            title: string;
            summary: string | null;
            source_md: string | null;
          }[]
        >`
          SELECT slug, title, metadata->>'summary' AS summary, source_md
          FROM archive_entries
          WHERE slug = ANY(${[...slugs.archive]})
            AND is_draft = false AND deleted_at IS NULL
            AND category != 'dialogue'
        `
      : Promise.resolve([]),
  ]);

  const previews = new Map<string, string>();
  for (const character of characters) {
    previews.set(
      `/characters/${character.slug}`,
      previewText(character.bio || character.source_md) ?? character.name,
    );
    previews.set(
      `/characters/${character.slug}/sheet`,
      previewText(character.bio || character.source_md) ?? character.name,
    );
    previews.set(
      `/characters/${character.slug}/logs`,
      previewText(character.bio || character.source_md) ?? character.name,
    );
  }
  for (const entry of archiveEntries) {
    previews.set(
      `/archive/${entry.slug}`,
      previewText(entry.summary || entry.source_md) ?? entry.title,
    );
  }

  return html.replace(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi, (tag, rawHref: string) => {
    const href = rawHref.replace(/&amp;/g, "&");
    const target = hrefs.get(href);
    if (!target) return tag;
    // Gespeicherte Vorschauen dürfen nach dem Zurückziehen eines Ziels nicht
    // weiter dessen Text verraten. Öffentliche Ziele erhalten den aktuellen Text.
    if (/\bdata-preview=/i.test(tag)) {
      tag = tag.replace(/\sdata-preview="[^"]*"/gi, "").replace(/\stitle="[^"]*"/gi, "");
    }
    const baseHref = `/${target.type}/${target.slug}`;
    const preview = previews.get(href) ?? previews.get(baseHref);
    if (!preview) return tag;

    const classMatch = tag.match(/\bclass="([^"]*)"/i);
    let decoratedTag = classMatch
      ? classMatch[1].split(/\s+/).includes("lcars-wikilink")
        ? tag
        : tag.replace(
            /\bclass="([^"]*)"/i,
            `class="${escapeAttribute(`${classMatch[1]} lcars-wikilink`)}"`,
          )
      : tag.replace(/>$/, ' class="lcars-wikilink">');
    let attributes = "";
    attributes += ` data-preview="${escapeAttribute(preview)}"`;
    if (!/\btitle="/i.test(decoratedTag)) {
      attributes += ` title="${escapeAttribute(preview)}"`;
    }
    decoratedTag = `${decoratedTag.slice(0, -1)}${attributes}>`;
    return decoratedTag;
  });
}

// Das Ziel eines nicht auflösbaren Verweises landet in einem title-Attribut
// des gespeicherten HTML — und stammt aus dem Text, den jemand geschrieben
// hat. Ein " darin würde das Attribut beenden. Heute kann das nicht passieren,
// weil remarkGermanQuotes gerade Anführungszeichen schon vor dem Wikilink-
// Schritt zu typografischen macht (siehe src/lib/markdown.ts) — aber daran
// soll die Sicherheit dieser Zeile nicht hängen.
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Die gemeinsame Ersetzung der beiden Auflöser oben: jeder
// <a href="wikilink://Ziel">Text</a> wird zum echten Link — oder, wenn das
// Ziel nirgends gefunden wird, zum „nicht gefunden"-Platzhalter, wie beim
// Ingest (scripts/ingest/wikilinks.ts).
function replaceWikilinkTags(
  html: string,
  hrefFor: (target: string) => { href: string; preview?: string | null } | undefined,
): string {
  return html.replace(
    WIKILINK_TAG_RE,
    (_full, rawTarget: string, text: string) => {
      const { target, anchor } = splitWikilinkTarget(rawTarget);
      const match = hrefFor(target);
      if (!match) {
        return `<span class="lcars-wikilink lcars-wikilink--missing" title="Kein Eintrag gefunden: ${escapeAttribute(target)}">${text}</span>`;
      }
      const preview = match.preview
        ? ` data-preview="${escapeAttribute(match.preview)}" title="${escapeAttribute(match.preview)}"`
        : "";
      return `<a href="${escapeAttribute(match.href + anchor)}" class="lcars-wikilink"${preview}>${text}</a>`;
    },
  );
}

// Trennt "Ziel#anker" aus dem wikilink://-Pfad wieder auf. Beide Teile sind
// einzeln URL-kodiert (siehe remarkWikiLinks in src/lib/markdown.ts), ein #
// im Ziel oder im Anker steht dort also als %23 — das erste rohe # ist
// deshalb immer das Trennzeichen. Der Anker kommt fertig slugifiziert an
// (headingAnchor, dieselbe Funktion, aus der rehypeSlug die id der
// Überschrift auf der Zielseite bildet) und wird unverändert an den Pfad
// gehängt.
export function splitWikilinkTarget(rawTarget: string): {
  target: string;
  anchor: string;
} {
  const hash = rawTarget.indexOf("#");
  const rawName = hash === -1 ? rawTarget : rawTarget.slice(0, hash);
  const rawAnchor = hash === -1 ? "" : rawTarget.slice(hash + 1);
  return {
    target: decodeHtmlEntities(decodeURIComponent(rawName)),
    anchor: rawAnchor
      ? `#${decodeHtmlEntities(decodeURIComponent(rawAnchor))}`
      : "",
  };
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
  return { sourceMd, html: await renderAutolinkedHtml(sourceMd, matches) };
}

// Das HTML eines Autolinking-Durchlaufs — und zwar mit ALLEN Wikilinks
// aufgelöst, nicht nur den eben erzeugten.
//
// Das war der Fehler: Ein von Hand getipptes [[Ziel]] gehört für
// applyAutolinks zu den geschützten Bereichen (PROTECTED_RE) und steht
// deshalb nie in matches — resolveAutolinkedWikilinks kennt es also nicht und
// ließ es als <a href="wikilink://Ziel"> stehen: ein Link, der wie einer
// aussieht, aber nirgendwohin führt. Betroffen war jeder Inhalt, der MIT dem
// Haken „Automatisch verlinken" gespeichert wurde (bei neuen Inhalten die
// Vorgabe); ohne den Haken lief derselbe Text über renderContentHtml und
// wurde korrekt aufgelöst. Nur scheinbar funktionierte es, wenn derselbe Name
// woanders im Text unverklammert vorkam: dann brachte ihn erst der
// Autolinking-Treffer in matches.
//
// Die Reihenfolge bleibt: erst die eben erzeugten Links aus matches (ohne
// weitere Abfrage), dann für alles Übriggebliebene ein Blick in die DB —
// resolveAllWikilinks steigt sofort aus, wenn nichts übrig ist.
export async function renderAutolinkedHtml(
  sourceMd: string,
  matches: AutolinkMatch[],
): Promise<string> {
  return resolveAllWikilinks(
    resolveAutolinkedWikilinks(await markdownToHtml(sourceMd), matches),
  );
}
