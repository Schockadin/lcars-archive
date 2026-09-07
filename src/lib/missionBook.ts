import "server-only";
import sql from "@/lib/db";
import { canView, type Viewer, type Visibility } from "@/lib/visibility";

// Die Missionsakte: EINE Mission mit ihrer Beschreibung und allen Logbüchern,
// die der Betrachter lesen darf — die Datenseite dazu (das Layout steht in
// src/lib/pdf/MissionBookPdfDocument.tsx).
//
// Vorher war das ein Kampagnenband über alle Missionen. Der Band war ein
// Export, den man einmal zieht; gebraucht wird beim Spielen die Akte der
// Mission, die gerade auf dem Tisch liegt — und die steht dort, wo die
// Mission steht, nicht auf der Übersicht.
//
// Bewusst OHNE "use cache": die Akte hängt an der Sichtbarkeit der Person,
// die sie zieht (nicht-öffentliche Logbücher gehören nur ihrem Autor bzw. der
// Spielleitung). Ein gecachter Export müsste den Betrachter in den Cache-Key
// nehmen und wäre damit ein Cache je Konto.

export interface MissionBookLog {
  slug: string;
  title: string;
  sessionNr: number | null;
  logDate: string | null;
  authorName: string | null;
  sourceMarkdown: string;
  // Nur zur Kennzeichnung in der Akte: was nicht öffentlich ist, steht im
  // Ausdruck mit einem Hinweis, damit niemand versehentlich ein
  // Spielleitungs-Logbuch weiterreicht.
  visibility: Visibility;
}

export interface MissionBook {
  generatedAt: Date;
  slug: string;
  title: string;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sourceMarkdown: string;
  isDraft: boolean;
  participants: string[];
  logs: MissionBookLog[];
}

interface MissionRow {
  id: number;
  slug: string;
  title: string;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  source_md: string | null;
  is_draft: boolean;
}

interface LogRow {
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  author_name: string | null;
  source_md: string | null;
  visibility: Visibility;
  owner_user_id: number | null;
}

// Die Akte einer Mission. Ohne Treffer null — die Route macht daraus ein 404,
// dieselbe Antwort wie die Mission-Detailseite auf einen unbekannten Slug.
//
// Der Entwurfs-Zustand kommt mit heraus, statt hier schon zu entscheiden: wer
// eine Entwurfs-Mission sehen darf, steht in canViewMissionDraft, und diese
// Regel gehört an eine Stelle (die Route), nicht in zwei.
export async function getMissionBook(
  slug: string,
  viewer: Viewer | null,
): Promise<MissionBook | null> {
  const [mission] = await sql<MissionRow[]>`
    SELECT id, slug, title, status,
           started_at::text AS started_at,
           ended_at::text   AS ended_at,
           source_md, is_draft
    FROM missions
    WHERE slug = ${slug} AND deleted_at IS NULL
    LIMIT 1
  `;
  if (!mission) return null;

  // Logbücher und Teilnehmer hängen beide nur an der Mission-Id — zusammen
  // holen statt nacheinander.
  const [logRows, participantRows] = await Promise.all([
    sql<LogRow[]>`
      SELECT ml.slug,
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
        AND ml.mission_id = ${mission.id}
      ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST
    `,
    sql<{ name: string }[]>`
      SELECT c.name
      FROM mission_participants mp
      JOIN characters c ON c.id = mp.character_id
      WHERE mp.mission_id = ${mission.id}
      ORDER BY c.name ASC
    `,
  ]);

  const logs = logRows
    // Die Sichtbarkeitsregel ist dieselbe wie auf der Logbuch-Seite — in der
    // Akte darf nichts stehen, was die Person nicht ohnehin lesen darf.
    .filter((row) => canView(row.visibility, row.owner_user_id, viewer))
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      sessionNr: row.session_nr,
      logDate: row.log_date,
      authorName: row.author_name,
      sourceMarkdown: row.source_md ?? "",
      visibility: row.visibility,
    }));

  return {
    generatedAt: new Date(),
    slug: mission.slug,
    title: mission.title,
    status: mission.status,
    startedAt: mission.started_at,
    endedAt: mission.ended_at,
    sourceMarkdown: mission.source_md ?? "",
    isDraft: mission.is_draft,
    participants: participantRows.map((row) => row.name),
    logs,
  };
}
