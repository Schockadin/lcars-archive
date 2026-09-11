import "server-only";
import sql from "@/lib/db";
import { canView, type Viewer } from "@/lib/visibility";
import type { Visibility } from "@/lib/visibility";
import { synopsisExcerpt } from "@/lib/missionFormat";
import { markdownToHtml } from "@/lib/markdown";
import {
  eventId,
  parseTimelineMarkers,
  isIsoDate,
  sortEvents,
  type TimelineEvent,
  type TimelineSourceType,
} from "@/lib/timelineTypes";
import {
  archiveHref,
  characterHref,
  missionHref,
  missionLogHref,
  contentImageSrc,
} from "@/lib/contentRoutes";
import { getFirstContentImageIdsBySlug } from "@/lib/contentImages";
import { resolvePortraitView, type PortraitCrop } from "@/lib/portraitCrop";

// Die Chronologie (/chronologie): alle Ereignisse der Kampagne in zeitlicher
// Folge, aus drei Quellen zusammengetragen.
//
//   1. Den gepflegten Angaben der Inhalte selbst — Missionsbeginn und -ende,
//      Logbuch-Datum, Datum eines Gesprächs, Geburtsdatum einer Figur.
//   2. Den <!-- timeline: JJJJ-MM-TT | Titel | Kategorie -->-Markern im
//      Fließtext. Die gibt es seit langem (TimelineMarkerButton in der
//      Werkzeugleiste jedes Textfeldes); sie erzeugen im gerenderten Text eine
//      unsichtbare Sprungmarke #timeline-N, auf die die Karte hier verlinkt.
//   3. Den vom Sprachmodell abgeleiteten Ereignissen, die die Spielleitung
//      übernommen hat (Tabelle timeline_events, siehe timelineInference.ts).
//
// (1) und (2) werden BEIM LESEN aus den Inhalten gebildet und nicht
// gespeichert: eine gespeicherte Kopie liefe bei jeder Bearbeitung
// auseinander, und die Sichtbarkeit müsste doppelt gepflegt werden. Nur (3)
// liegt in einer Tabelle — es kostet einen Modellaufruf und darf nicht bei
// jedem Seitenaufruf neu entstehen.
//
// Bewusst OHNE "use cache": die Chronologie hängt an der Sichtbarkeit der
// betrachtenden Person (nicht-öffentliche Logbücher) — dieselbe
// Begründung wie beim Beziehungsgraph und bei der Missionsakte. Es sind fünf
// Abfragen für die ganze Seite, nicht eine je Inhalt.

interface MissionRow {
  slug: string;
  title: string;
  started_at: string | null;
  ended_at: string | null;
  source_md: string | null;
  is_draft: boolean;
  owner_user_id: number | null;
  participants: string[];
}

interface LogRow {
  slug: string;
  title: string;
  log_date: string | null;
  source_md: string | null;
  visibility: Visibility;
  owner_user_id: number | null;
  is_draft: boolean;
  mission_slug: string;
  author_name: string | null;
}

interface ArchiveRow {
  slug: string;
  title: string;
  category: string;
  metadata: Record<string, unknown>;
  source_md: string | null;
  visibility: Visibility;
  owner_user_id: number | null;
  is_draft: boolean;
}

interface CharacterRow {
  slug: string;
  name: string;
  metadata: Record<string, unknown>;
  source_md: string | null;
  bio: string | null;
  // Zugeschnittenes Portrait der Figur (Adresse), falls gepflegt — es ist das
  // Vorschaubild ihrer Karten.
  portrait: string | null;
  visibility: Visibility;
  // Charaktere führen ihre Eigentümerin/ihren Eigentümer als player_id, nicht
  // als owner_user_id wie die übrigen Inhalte.
  player_id: number | null;
  is_draft: boolean;
}

interface InferredRow {
  id: number;
  event_date: string;
  title: string;
  detail: string | null;
  category: string;
  // Leer bei einem von Hand eingetragenen Ereignis (origin 'manual'): es
  // gehört zu keinem Inhalt.
  source_type: TimelineSourceType | null;
  source_slug: string | null;
  origin: "inferred" | "manual";
}

// Kurzer Anriss für die Karte. Markdown-Auszeichnungen fallen weg, damit auf
// der Karte kein rohes ** oder [[…]] steht.
function excerptOf(markdown: string | null): string | null {
  if (!markdown) return null;
  const flat = markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[*_`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return flat ? synopsisExcerpt(flat, 180) : null;
}

// Ein Datum aus den frei gepflegten Attributen eines Datenbank-Eintrags.
// Die Attribute sind Frontmatter-Paare (Label/Wert) — welches Label die Runde
// dafür verwendet, steht nirgends fest. Deshalb: das erste Attribut, dessen
// Label nach einem Datum klingt UND dessen Wert ein ISO-Datum ist. Exportiert,
// weil genau diese Heuristik prüfbar sein soll.
export function dateFromAttributes(metadata: Record<string, unknown>): string | null {
  const attributes = metadata.attributes;
  if (!Array.isArray(attributes)) return null;
  for (const attribute of attributes) {
    if (!attribute || typeof attribute !== "object") continue;
    const { label, value } = attribute as { label?: unknown; value?: unknown };
    if (typeof label !== "string" || typeof value !== "string") continue;
    if (!/datum|date|zeitpunkt/i.test(label)) continue;
    const trimmed = value.trim();
    if (isIsoDate(trimmed)) return trimmed;
  }
  return null;
}

// Die Marker eines Inhalts als Ereignisse. Der Link führt an die markierte
// Stelle im Text (#timeline-N, siehe remarkTimelineAnchors in markdown.ts).
function markerEvents(
  markdown: string | null,
  ctx: {
    sourceType: TimelineSourceType;
    slug: string;
    sourceTitle: string;
    href: string;
    people: string[];
  },
): TimelineEvent[] {
  if (!markdown) return [];
  return parseTimelineMarkers(markdown).map((marker) => ({
    id: eventId(ctx.sourceType, ctx.slug, `marker-${marker.anchor}`),
    date: marker.date,
    title: marker.title,
    detail: null,
    category: marker.category,
    origin: "marker" as const,
    sourceType: ctx.sourceType,
    sourceTitle: ctx.sourceTitle,
    href: `${ctx.href}#timeline-${marker.anchor}`,
    people: ctx.people,
  }));
}

export async function getTimeline(viewer: Viewer | null): Promise<TimelineEvent[]> {
  const [
    missions,
    logs,
    entries,
    characters,
    inferred,
    eventCharacters,
    thumbnails,
  ] = await Promise.all([
    sql<MissionRow[]>`
      SELECT m.slug, m.title,
             m.started_at::text AS started_at,
             m.ended_at::text   AS ended_at,
             m.source_md, m.is_draft, m.owner_user_id,
             COALESCE(
               ARRAY_AGG(c.name ORDER BY c.name) FILTER (WHERE c.id IS NOT NULL),
               '{}'
             ) AS participants
      FROM missions m
      LEFT JOIN mission_participants mp ON mp.mission_id = m.id
      LEFT JOIN characters c ON c.id = mp.character_id AND c.deleted_at IS NULL
      WHERE m.deleted_at IS NULL
      GROUP BY m.id
    `,
    sql<LogRow[]>`
      SELECT ml.slug, ml.title,
             ml.log_date::text AS log_date,
             ml.source_md, ml.visibility, ml.owner_user_id, ml.is_draft,
             m.slug AS mission_slug,
             c.name AS author_name
      FROM mission_logs ml
      JOIN missions m ON m.id = ml.mission_id AND m.deleted_at IS NULL
      LEFT JOIN characters c ON c.id = ml.author_id
      WHERE ml.deleted_at IS NULL
    `,
    sql<ArchiveRow[]>`
      SELECT slug, title, category, metadata, source_md,
             visibility, owner_user_id, is_draft
      FROM archive_entries
      WHERE deleted_at IS NULL
        -- Ein LAUFENDES Gespräch gehört noch nicht in die Chronologie: es ist
        -- kein abgeschlossenes Ereignis, und seine Karte führte auf eine
        -- Seite, die für alle außer den Beteiligten auf /dialogues/<slug>
        -- umleitet (dort ist dann Schluss). Dieselbe Bedingung wie in
        -- getAllArchivePaths (src/lib/archive.ts).
        AND NOT (category = 'dialogue' AND dialogue_open)
    `,
    sql<CharacterRow[]>`
      SELECT slug, name, metadata, source_md, bio, portrait,
             visibility, player_id, is_draft
      FROM characters
      WHERE deleted_at IS NULL
    `,
    sql<InferredRow[]>`
      SELECT id, event_date::text AS event_date, title, detail, category,
             source_type, source_slug, origin
      FROM timeline_events
    `,
    // Die Beteiligten der von Hand eingetragenen Ereignisse. Eine Abfrage für
    // alle statt einer je Ereignis; die Namen kommen aus der Figur selbst,
    // damit eine Umbenennung überall durchschlägt.
    sql<{ eventId: number; name: string }[]>`
      SELECT ec.event_id AS "eventId", c.name
      FROM timeline_event_characters ec
      JOIN characters c ON c.id = ec.character_id
      WHERE c.deleted_at IS NULL
      ORDER BY c.name ASC
    `,
    // Das erste hochgeladene Bild je Inhalt („<Inhaltsart>:<Slug>" → Bild-Id)
    // — daraus wird das Vorschaubild der Karte. Eine Abfrage für alle
    // Ereignisse; wer kein Bild hat, steht gar nicht in der Map und bekommt
    // auch keinen Platzhalter.
    getFirstContentImageIdsBySlug(),
  ]);

  // Das Vorschaubild einer Quelle — der Charakter nimmt sein Portrait, sofern
  // er eines hat (dasselbe Bild, das die Personalakte zeigt), sonst gilt für
  // alle vier Inhaltsarten das erste hochgeladene Bild.
  const portraits = new Map(
    characters.map((character) => {
      const metadata = character.metadata ?? {};
      return [
        character.slug,
        resolvePortraitView(
          character.portrait,
          typeof metadata.portraitSource === "string"
            ? metadata.portraitSource
            : null,
          metadata.portraitCrop,
        ),
      ] as const;
    }),
  );
  const thumbnailOf = (
    sourceType: TimelineSourceType,
    slug: string,
  ): { src: string | null; crop: PortraitCrop | null } => {
    if (sourceType === "character") {
      const view = portraits.get(slug);
      // Portrait samt Ausschnitt — dieselbe Darstellung wie auf dem Bogen.
      if (view?.src) return { src: view.src, crop: view.crop };
    }
    const imageId = thumbnails.get(`${sourceType}:${slug}`);
    return {
      src: imageId ? contentImageSrc(imageId) : null,
      crop: null,
    };
  };

  const manualPeople = new Map<number, string[]>();
  for (const row of eventCharacters) {
    const list = manualPeople.get(row.eventId) ?? [];
    list.push(row.name);
    manualPeople.set(row.eventId, list);
  }

  const events: TimelineEvent[] = [];
  // Welche Inhalte die betrachtende Person sehen darf — die abgeleiteten
  // Ereignisse hängen an derselben Entscheidung wie ihr Quell-Inhalt und
  // werden weiter unten daran gemessen.
  const visibleSources = new Map<
    string,
    { title: string; href: string; sourceType: TimelineSourceType }
  >();
  // Quelle + Tag jedes Ereignisses, das der Eintrag selbst hergibt (gepflegte
  // Angabe oder Marke). Ein abgeleitetes Ereignis auf demselben Tag derselben
  // Quelle wäre eine Dopplung — siehe die Begründung weiter unten.
  const deterministicDays = new Set<string>();
  const dayKey = (
    sourceType: TimelineSourceType,
    slug: string,
    date: string | null,
  ) => `${sourceType}:${slug}|${date ?? "undated"}`;
  // Ereignisse einsammeln UND ihren Tag vermerken. Beides an einer Stelle,
  // damit die Sammlung nicht vergessen wird, wenn eine Quelle dazukommt.
  const addDeterministic = (
    slug: string,
    ...added: TimelineEvent[]
  ): void => {
    for (const event of added) {
      // Das Vorschaubild hängt an der Quelle, nicht am einzelnen Ereignis —
      // deshalb hier zentral gesetzt statt an jeder der Stellen, die ein
      // Ereignis bauen.
      const thumbnail = thumbnailOf(event.sourceType, slug);
      event.thumbnail = thumbnail.src;
      event.thumbnailCrop = thumbnail.crop;
      events.push(event);
      deterministicDays.add(dayKey(event.sourceType, slug, event.date));
    }
  };

  // ── Missionen ────────────────────────────────────────────────────────────
  // Missionen kennen keine Sichtbarkeit, nur Entwurfsstatus (siehe
  // getAllMissions): ein Entwurf gehört nur seiner Autorin/seinem Autor.
  for (const mission of missions) {
    // Entwürfe erscheinen in der Chronologie GAR NICHT — auch nicht ihrem
    // Owner. Die Chronologie ist seit dem Zusammenlegen die Missions-Übersicht,
    // und die zeigte noch nie Entwürfe (getAllMissions filtert sie in der
    // Abfrage weg). Ein Zeitstrahl, der für eine Person Ereignisse enthält,
    // die für alle anderen nicht existieren, erzählt außerdem eine andere
    // Kampagne als die, über die am Tisch geredet wird.
    if (mission.is_draft) continue;
    const href = missionHref(mission.slug);
    const people = mission.participants ?? [];
    visibleSources.set(`mission:${mission.slug}`, {
      title: mission.title,
      href,
      sourceType: "mission",
    });

    if (mission.started_at) {
      addDeterministic(mission.slug, {
        id: eventId("mission", mission.slug, "start"),
        date: mission.started_at,
        title: mission.title,
        detail: "Beginn des Einsatzes.",
        category: "mission",
        phase: "start",
        origin: "metadata",
        sourceType: "mission",
        sourceTitle: mission.title,
        href,
        people,
      });
    }
    // Ein Ende am selben Tag wie der Beginn wäre auf dem Zeitstrahl eine
    // Dopplung — dann steht nur der Beginn da.
    if (mission.ended_at && mission.ended_at !== mission.started_at) {
      addDeterministic(mission.slug, {
        id: eventId("mission", mission.slug, "end"),
        date: mission.ended_at,
        title: mission.title,
        detail: "Abschluss des Einsatzes.",
        category: "mission",
        phase: "end",
        origin: "metadata",
        sourceType: "mission",
        sourceTitle: mission.title,
        href,
        people,
      });
    }
    addDeterministic(
      mission.slug,
      ...markerEvents(mission.source_md, {
        sourceType: "mission",
        slug: mission.slug,
        sourceTitle: mission.title,
        href,
        people,
      }),
    );
  }

  // ── Logbücher ────────────────────────────────────────────────────────────
  for (const log of logs) {
    if (!canView(log.visibility, log.owner_user_id, viewer)) continue;
    if (log.is_draft) continue;
    const href = missionLogHref(log.mission_slug, log.slug);
    const people = log.author_name ? [log.author_name] : [];
    visibleSources.set(`mission_log:${log.slug}`, {
      title: log.title,
      href,
      sourceType: "mission_log",
    });

    // Das Datum ist am Logbuch optional (siehe missionLogHeadFields.ts). Ein
    // undatiertes Logbuch stand deshalb in keiner Chronologie — obwohl die
    // Charakterseite mit ihrer Zahl „Logs" genau dorthin verlinkt und die
    // Zahl es mitzählte. Es steht jetzt wie ein undatiertes Gespräch in der
    // Gruppe „Ohne Datum" am Ende (siehe sortEvents).
    addDeterministic(log.slug, {
      id: eventId("mission_log", log.slug, "date"),
      date: log.log_date,
      title: log.title,
      detail: excerptOf(log.source_md),
      category: "log",
      origin: "metadata",
      sourceType: "mission_log",
      sourceTitle: log.title,
      href,
      people,
    });
    addDeterministic(
      log.slug,
      ...markerEvents(log.source_md, {
        sourceType: "mission_log",
        slug: log.slug,
        sourceTitle: log.title,
        href,
        people,
      }),
    );
  }

  // ── Datenbank-Einträge ───────────────────────────────────────────────────
  for (const entry of entries) {
    if (!canView(entry.visibility, entry.owner_user_id, viewer)) continue;
    if (entry.is_draft) continue;
    const href =
      entry.category === "dialogue"
        ? `/characters/dialogues/${entry.slug}`
        : archiveHref(entry.slug);
    const metadata = entry.metadata ?? {};
    const participants = Array.isArray(metadata.participants)
      ? (metadata.participants as { name?: unknown }[])
          .map((p) => (typeof p?.name === "string" ? p.name : null))
          .filter((n): n is string => Boolean(n))
      : [];
    visibleSources.set(`archive_entry:${entry.slug}`, {
      title: entry.title,
      href,
      sourceType: "archive_entry",
    });

    // Ein Gespräch hat sein In-Story-Datum in metadata.logDate; ein Eintrag
    // der Kategorie „Ereignis" trägt es unter seinen Attributen (siehe
    // dateFromAttributes).
    const logDate =
      typeof metadata.logDate === "string" && isIsoDate(metadata.logDate.trim())
        ? metadata.logDate.trim()
        : null;
    const date = logDate ?? dateFromAttributes(metadata);
    // Ein Gespräch steht in der Chronologie AUCH ohne Datum: sie ist seit dem
    // Umzug aus dem Charaktere-Bereich die Übersicht der Gespräche, und ein
    // Gespräch ohne gepflegtes In-Story-Datum wäre sonst nirgends zu finden.
    // Es landet in der Gruppe „Ohne Datum" am Ende (siehe sortEvents).
    const isDialogue = entry.category === "dialogue";
    if (date || isDialogue) {
      addDeterministic(entry.slug, {
        id: eventId("archive_entry", entry.slug, "date"),
        date,
        title: entry.title,
        detail:
          typeof metadata.summary === "string" && metadata.summary
            ? synopsisExcerpt(metadata.summary, 180)
            : excerptOf(entry.source_md),
        category: isDialogue ? "dialogue" : "other",
        origin: "metadata",
        sourceType: "archive_entry",
        sourceTitle: entry.title,
        href,
        people: participants,
      });
    }
    addDeterministic(
      entry.slug,
      ...markerEvents(entry.source_md, {
        sourceType: "archive_entry",
        slug: entry.slug,
        sourceTitle: entry.title,
        href,
        people: participants,
      }),
    );
  }

  // ── Charaktere ───────────────────────────────────────────────────────────
  for (const character of characters) {
    if (!canView(character.visibility, character.player_id, viewer)) continue;
    if (character.is_draft) continue;
    const href = characterHref(character.slug);
    const metadata = character.metadata ?? {};
    visibleSources.set(`character:${character.slug}`, {
      title: character.name,
      href,
      sourceType: "character",
    });

    const birth =
      typeof metadata.dateOfBirth === "string" &&
      isIsoDate(metadata.dateOfBirth.trim())
        ? metadata.dateOfBirth.trim()
        : null;
    if (birth) {
      addDeterministic(character.slug, {
        id: eventId("character", character.slug, "birth"),
        date: birth,
        title: `${character.name} geboren`,
        detail: null,
        category: "character",
        origin: "metadata",
        sourceType: "character",
        sourceTitle: character.name,
        href,
        people: [character.name],
      });
    }
    // Die Biografie liegt als source_md an der Akte; ältere Datensätze haben
    // nur bio (gerendertes HTML) — Marker stehen in beiden als Kommentar.
    addDeterministic(
      character.slug,
      ...markerEvents(character.source_md ?? character.bio, {
        sourceType: "character",
        slug: character.slug,
        sourceTitle: character.name,
        href,
        people: [character.name],
      }),
    );
  }

  // ── Abgeleitete Ereignisse ───────────────────────────────────────────────
  // Sie hängen an der Sichtbarkeit ihres Quell-Inhalts: ist der für diese
  // Person nicht sichtbar (oder inzwischen gelöscht), fällt das Ereignis weg.
  //
  // Und sie treten hinter das zurück, was der Eintrag selbst hergibt: steht an
  // diesem Tag von derselben Quelle schon eine gepflegte Angabe oder eine
  // Marke, ist das Abgeleitete eine Dopplung. Die Ableitung filtert das schon
  // beim Speichern (dropKnownDates in timelineInference.ts) — hier steht das
  // Netz für Zeilen, die vor dieser Regel entstanden sind oder deren Quelle
  // ihr Datum seither bekommen hat.
  for (const row of inferred) {
    // Von Hand eingetragene Ereignisse hängen an keinem Inhalt: keine
    // Sichtbarkeitsprüfung (es gibt keine Quelle, die etwas verbergen
    // könnte), keine Dopplungs-Prüfung (sie stehen für sich) und kein Link.
    if (row.origin === "manual") {
      events.push({
        id: `manual:${row.id}`,
        date: row.event_date,
        title: row.title,
        detail: row.detail,
        category: row.category,
        origin: "manual",
        // sourceType trägt die Karte als „Quelle"; ein freies Ereignis hat
        // keine, nimmt aber den Platz im Typ ein — archive_entry ist die
        // neutralste der vier und wird nirgends verlinkt, weil href null ist.
        sourceType: "archive_entry",
        sourceTitle: row.title,
        href: null,
        people: manualPeople.get(row.id) ?? [],
        // Kein Inhalt, also kein Bild.
        thumbnail: null,
      });
      continue;
    }

    // Ein abgeleitetes Ereignis OHNE Quelle kann es nicht geben (die
    // Ableitung läuft je Inhalt) — die Spalten sind nur wegen der freien
    // Ereignisse nullable.
    if (!row.source_type || !row.source_slug) continue;
    const source = visibleSources.get(`${row.source_type}:${row.source_slug}`);
    if (!source) continue;
    if (
      deterministicDays.has(
        dayKey(row.source_type, row.source_slug, row.event_date),
      )
    ) {
      continue;
    }
    const thumbnail = thumbnailOf(row.source_type, row.source_slug);
    events.push({
      id: `inferred:${row.id}`,
      date: row.event_date,
      title: row.title,
      detail: row.detail,
      category: row.category,
      origin: "inferred",
      sourceType: source.sourceType,
      sourceTitle: source.title,
      href: source.href,
      people: [],
      thumbnail: thumbnail.src,
      thumbnailCrop: thumbnail.crop,
    });
  }

  // Die Beschreibung eines von Hand eingetragenen Ereignisses wird als
  // Markdown erfasst (MarkdownEditor im Eintragen-Fenster) — also auch als
  // Markdown angezeigt. Nur für diese wenigen gerendert: die übrigen
  // Beschreibungen sind generierte Sätze oder Textausschnitte.
  await Promise.all(
    events.map(async (event) => {
      if (event.origin === "manual" && event.detail) {
        event.detailHtml = await markdownToHtml(event.detail);
      }
    }),
  );

  return sortEvents(events, "desc");
}
