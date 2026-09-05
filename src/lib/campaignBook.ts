import "server-only";
import sql from "@/lib/db";
import { canView, type Viewer, type Visibility } from "@/lib/visibility";

// Der Kampagnenband: alle Missionen mit ihren Logbüchern in einem Dokument,
// chronologisch geordnet — die Datenseite dazu (das Layout steht in
// src/lib/pdf/CampaignBookPdfDocument.tsx).
//
// Bewusst OHNE "use cache": der Band hängt an der Sichtbarkeit der Person,
// die ihn zieht (nicht-öffentliche Logbücher gehören nur ihrem Autor bzw. der
// Spielleitung). Ein gecachter Band müsste den Betrachter in den Cache-Key
// nehmen und wäre damit ein Cache je Konto — für einen Export, den man selten
// zieht, ist das die falsche Rechnung.
//
// Zwei Abfragen für den ganzen Band (Missionen, dann alle Logbücher auf
// einmal) statt einer Abfrage je Mission: bei 30 Missionen wären das sonst
// 31 Roundtrips für dasselbe Ergebnis.

export interface CampaignBookLog {
  slug: string;
  title: string;
  sessionNr: number | null;
  logDate: string | null;
  authorName: string | null;
  sourceMarkdown: string;
  // Nur zur Kennzeichnung im Band: was nicht öffentlich ist, steht im
  // Ausdruck mit einem Hinweis, damit niemand versehentlich ein
  // Spielleitungs-Logbuch weiterreicht.
  visibility: Visibility;
}

export interface CampaignBookMission {
  slug: string;
  title: string;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sourceMarkdown: string;
  logs: CampaignBookLog[];
}

export interface CampaignBook {
  generatedAt: Date;
  missions: CampaignBookMission[];
  // Summen für die Titelseite.
  logCount: number;
}

interface MissionRow {
  id: number;
  slug: string;
  title: string;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  source_md: string | null;
}

interface LogRow {
  mission_id: number;
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  author_name: string | null;
  source_md: string | null;
  visibility: Visibility;
  owner_user_id: number | null;
}

// Chronologisch heißt hier: älteste zuerst — ein Band liest sich von vorn.
// Missionen ohne Startdatum hängen hinten an (sie haben keinen Platz in der
// Zeitleiste), innerhalb einer Mission zählt das Logbuch-Datum, ersatzweise
// die Session-Nummer.
export async function getCampaignBook(
  viewer: Viewer | null,
): Promise<CampaignBook> {
  const missionRows = await sql<MissionRow[]>`
    SELECT id, slug, title, status,
           started_at::text AS started_at,
           ended_at::text   AS ended_at,
           source_md
    FROM missions
    WHERE deleted_at IS NULL AND is_draft = false
    ORDER BY started_at ASC NULLS LAST, created_at ASC
  `;

  const logRows =
    missionRows.length === 0
      ? []
      : await sql<LogRow[]>`
          SELECT ml.mission_id,
                 ml.slug,
                 ml.title,
                 ml.session_nr,
                 ml.log_date::text AS log_date,
                 c.name            AS author_name,
                 ml.source_md,
                 ml.visibility,
                 ml.owner_user_id
          FROM mission_logs ml
          LEFT JOIN characters c ON c.id = ml.author_id
          WHERE ml.deleted_at IS NULL
            AND ml.is_draft = false
            AND ml.mission_id = ANY(${missionRows.map((m) => m.id)})
          ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST
        `;

  const byMission = new Map<number, CampaignBookLog[]>();
  for (const row of logRows) {
    // Die Sichtbarkeitsregel ist dieselbe wie auf der Logbuch-Seite —
    // im Band darf nichts stehen, was die Person nicht ohnehin lesen darf.
    if (!canView(row.visibility, row.owner_user_id, viewer)) continue;
    const list = byMission.get(row.mission_id) ?? [];
    list.push({
      slug: row.slug,
      title: row.title,
      sessionNr: row.session_nr,
      logDate: row.log_date,
      authorName: row.author_name,
      sourceMarkdown: row.source_md ?? "",
      visibility: row.visibility,
    });
    byMission.set(row.mission_id, list);
  }

  const missions = missionRows.map((row) => ({
    slug: row.slug,
    title: row.title,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    sourceMarkdown: row.source_md ?? "",
    logs: byMission.get(row.id) ?? [],
  }));

  return {
    generatedAt: new Date(),
    missions,
    logCount: missions.reduce((sum, m) => sum + m.logs.length, 0),
  };
}
