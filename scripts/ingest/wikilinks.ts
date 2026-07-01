// scripts/ingest/wikilinks.ts
//
// Zweite Pass-Stufe für Obsidian-artige [[Ziel]]-Verweise (siehe
// remarkWikiLinks in src/lib/markdown.ts). Beim Rendern einzelner Dateien ist
// noch nicht bekannt, ob und wo ein Ziel existiert – deshalb kodiert
// markdownToHtml solche Verweise vorerst als
// <a href="wikilink://<Ziel>">Text</a>.
//
// Dieser Schritt läuft NACH allen Ingest-Schritten über die kompletten
// Tabellen (nicht nur die gerade importierten Dateien), damit auch bereits
// vorhandene Inhalte aufgelöst werden, sobald ihr Linkziel neu hinzukommt.
import postgres from "postgres";

const WIKILINK_TAG_RE = /<a href="wikilink:\/\/([^"]*)">([\s\S]*?)<\/a>/g;

interface TitleEntry {
  url: string;
}

function norm(title: string): string {
  return title.trim().toLowerCase();
}

// Fallback für Ziele wie [[T'Mok]], die nicht dem Titel/Namen entsprechen,
// aber dem Slug (t-mok) – gleiche Normalisierung wie beim Erzeugen der
// eigentlichen Slugs: Kleinschreibung, Diakritika weg, alles Nicht-
// Alphanumerische wird zu einem Bindestrich zusammengefasst.
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// html-entities, die rehype-stringify in href/Text einsetzen kann. Apostrophe
// werden dabei als numerische Entity kodiert – rehype-stringify nutzt &#x27;
// (hex), nicht &#39; (dezimal); beide werden hier abgedeckt.
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function resolveHtml(
  html: string,
  titleMap: Map<string, TitleEntry>,
  slugMap: Map<string, TitleEntry>,
): string {
  return html.replace(WIKILINK_TAG_RE, (_full, rawTarget, text) => {
    const target = decodeEntities(decodeURIComponent(rawTarget));
    const entry = titleMap.get(norm(target)) ?? slugMap.get(slugify(target));
    if (!entry) {
      return `<span class="lcars-wikilink lcars-wikilink--missing" title="Kein Eintrag gefunden: ${target}">${text}</span>`;
    }
    return `<a href="${entry.url}" class="lcars-wikilink">${text}</a>`;
  });
}

export async function resolveWikiLinks(sql: postgres.Sql): Promise<void> {
  const [characters, missions, archiveEntries] = await Promise.all([
    sql<{ slug: string; name: string }[]>`SELECT slug, name FROM characters`,
    sql<{ slug: string; title: string }[]>`SELECT slug, title FROM missions`,
    sql<
      { slug: string; title: string }[]
    >`SELECT slug, title FROM archive_entries`,
  ]);

  // Priorität bei Titel-/Slug-Kollisionen: Charaktere > Archiv-Einträge > Missionen.
  const titleMap = new Map<string, TitleEntry>();
  const slugMap = new Map<string, TitleEntry>();
  for (const m of missions) {
    const entry = { url: `/missions/${m.slug}` };
    titleMap.set(norm(m.title), entry);
    slugMap.set(m.slug, entry);
  }
  for (const a of archiveEntries) {
    const entry = { url: `/archive/${a.slug}` };
    titleMap.set(norm(a.title), entry);
    slugMap.set(a.slug, entry);
  }
  for (const c of characters) {
    const entry = { url: `/characters/${c.slug}` };
    titleMap.set(norm(c.name), entry);
    slugMap.set(c.slug, entry);
  }

  let updated = 0;

  const charRows = await sql<
    { id: number; bio: string }[]
  >`SELECT id, bio FROM characters WHERE bio LIKE '%wikilink://%'`;
  for (const row of charRows) {
    const resolved = resolveHtml(row.bio, titleMap, slugMap);
    if (resolved !== row.bio) {
      await sql`UPDATE characters SET bio = ${resolved} WHERE id = ${row.id}`;
      updated++;
    }
  }

  const archiveRows = await sql<
    { id: number; content: string }[]
  >`SELECT id, content FROM archive_entries WHERE content LIKE '%wikilink://%'`;
  for (const row of archiveRows) {
    const resolved = resolveHtml(row.content, titleMap, slugMap);
    if (resolved !== row.content) {
      await sql`UPDATE archive_entries SET content = ${resolved} WHERE id = ${row.id}`;
      updated++;
    }
  }

  const logRows = await sql<
    { id: number; content: string }[]
  >`SELECT id, content FROM mission_logs WHERE content LIKE '%wikilink://%'`;
  for (const row of logRows) {
    const resolved = resolveHtml(row.content, titleMap, slugMap);
    if (resolved !== row.content) {
      await sql`UPDATE mission_logs SET content = ${resolved} WHERE id = ${row.id}`;
      updated++;
    }
  }

  const missionRows = await sql<
    { id: number; metadata: string | Record<string, unknown> }[]
  >`SELECT id, metadata FROM missions WHERE metadata->>'body' LIKE '%wikilink://%'`;
  for (const row of missionRows) {
    const metadata =
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as Record<string, unknown>)
        : row.metadata;
    const body = String(metadata.body ?? "");
    const resolved = resolveHtml(body, titleMap, slugMap);
    if (resolved !== body) {
      const nextMetadata = { ...metadata, body: resolved };
      await sql`UPDATE missions SET metadata = ${sql.json(nextMetadata)} WHERE id = ${row.id}`;
      updated++;
    }
  }

  console.log(`\n🔗 Wiki-Links: ${updated} Einträge aktualisiert`);
}
