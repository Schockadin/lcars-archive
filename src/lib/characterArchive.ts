import "server-only";
import { PDFDocument } from "pdf-lib";
import sql from "@/lib/db";
import {
  getOwnCharacterStats,
  getCharacterBioMarkdown,
} from "@/lib/characters";
import { listTalents } from "@/lib/talents";
import { listCampaignRules } from "@/lib/campaignRules";
import { renderCharacterSheetPdf } from "@/lib/pdf/CharacterSheetPdfDocument";
import { renderMissionBookPdf } from "@/lib/pdf/MissionBookPdfDocument";
import { renderContentPdf } from "@/lib/pdf/ContentPdfDocument";
import { renderCharacterArchiveTextPdf } from "@/lib/pdf/CharacterArchiveTextPdfDocument";
import { getMissionBook } from "@/lib/missionBook";
import {
  getCharacterDocumentBytes,
  getCharacterDocumentsForExport,
} from "@/lib/characterDocuments";
import { getUserById } from "@/lib/users";
import { getBaseUrl } from "@/lib/http";
import type { CharacterArchiveMissionOption } from "@/lib/characterArchiveTypes";
export type {
  CharacterArchiveLogOption,
  CharacterArchiveMissionOption,
} from "@/lib/characterArchiveTypes";

export async function getCharacterArchiveOptions(
  userId: number,
  characterId: number,
): Promise<CharacterArchiveMissionOption[]> {
  const rows = await sql<
    {
      mission_slug: string;
      mission_title: string;
      log_id: number;
      log_slug: string;
      log_title: string;
      log_date: string | null;
      session_nr: number | null;
      is_draft: boolean;
      mission_is_draft: boolean;
    }[]
  >`
    SELECT m.slug AS mission_slug, m.title AS mission_title,
           ml.id AS log_id, ml.slug AS log_slug, ml.title AS log_title,
           ml.log_date::text AS log_date, ml.session_nr, ml.is_draft,
           m.is_draft AS mission_is_draft
    FROM mission_logs ml
    JOIN missions m ON m.id = ml.mission_id
    JOIN characters c ON c.id = ml.author_id
    WHERE c.id = ${characterId} AND c.player_id = ${userId}
      AND c.deleted_at IS NULL AND ml.deleted_at IS NULL
      AND m.deleted_at IS NULL
    ORDER BY m.started_at ASC NULLS LAST, m.id ASC,
             ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST, ml.id ASC
  `;

  const missions = new Map<string, CharacterArchiveMissionOption>();
  for (const row of rows) {
    const mission = missions.get(row.mission_slug) ?? {
      slug: row.mission_slug,
      title: row.mission_title,
      canExportWholeMission: !row.mission_is_draft,
      logs: [],
    };
    mission.logs.push({
      id: row.log_id,
      slug: row.log_slug,
      title: row.log_title,
      logDate: row.log_date,
      sessionNr: row.session_nr,
      isDraft: row.is_draft,
    });
    missions.set(row.mission_slug, mission);
  }
  return [...missions.values()];
}

interface SelectedLogRow {
  id: number;
  slug: string;
  title: string;
  log_date: string | null;
  session_nr: number | null;
  source_md: string | null;
  mission_slug: string;
  mission_title: string;
  author_name: string;
}

export class CharacterArchiveError extends Error {}

async function appendPdf(target: PDFDocument, bytes: Uint8Array) {
  const source = await PDFDocument.load(bytes);
  const pages = await target.copyPages(source, source.getPageIndices());
  for (const page of pages) target.addPage(page);
}

export async function renderCharacterArchivePdf(input: {
  userId: number;
  characterId: number;
  includeCharacter: boolean;
  documentIds: number[];
  missionSlugs: string[];
  logIds: number[];
}): Promise<{ buffer: Buffer; characterName: string }> {
  const character = await getOwnCharacterStats(input.userId, input.characterId);
  if (!character) throw new CharacterArchiveError("Charakter nicht gefunden.");

  const options = await getCharacterArchiveOptions(
    input.userId,
    input.characterId,
  );
  const allowedMissions = new Set(
    options
      .filter((mission) => mission.canExportWholeMission)
      .map((mission) => mission.slug),
  );
  const logMission = new Map<number, string>();
  for (const mission of options) {
    for (const log of mission.logs) logMission.set(log.id, mission.slug);
  }

  const missionSlugs = [...new Set(input.missionSlugs)];
  const requestedLogIds = [...new Set(input.logIds)];
  if (missionSlugs.some((slug) => !allowedMissions.has(slug))) {
    throw new CharacterArchiveError("Ungültige Missionsauswahl.");
  }
  if (requestedLogIds.some((id) => !logMission.has(id))) {
    throw new CharacterArchiveError("Ungültige Logbuchauswahl.");
  }
  const selectedMissionSet = new Set(missionSlugs);
  const logIds = requestedLogIds.filter(
    (id) => !selectedMissionSet.has(logMission.get(id) ?? ""),
  );

  const documents = await getCharacterDocumentsForExport(input.characterId, [
    ...new Set(input.documentIds),
  ]);
  if (documents.length !== new Set(input.documentIds).size) {
    throw new CharacterArchiveError("Ungültige Dokumentauswahl.");
  }

  const logs =
    logIds.length === 0
      ? []
      : await sql<SelectedLogRow[]>`
          SELECT ml.id, ml.slug, ml.title, ml.log_date::text AS log_date,
                 ml.session_nr, ml.source_md, m.slug AS mission_slug,
                 m.title AS mission_title, c.name AS author_name
          FROM mission_logs ml
          JOIN missions m ON m.id = ml.mission_id
          JOIN characters c ON c.id = ml.author_id
          WHERE ml.id = ANY(${logIds}::int[])
            AND c.id = ${input.characterId} AND c.player_id = ${input.userId}
            AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
          ORDER BY ml.log_date ASC NULLS LAST, ml.session_nr ASC NULLS LAST, ml.id ASC
        `;
  if (logs.length !== logIds.length) {
    throw new CharacterArchiveError(
      "Mindestens ein Logbuch ist nicht mehr verfügbar.",
    );
  }

  if (
    !input.includeCharacter &&
    documents.length === 0 &&
    missionSlugs.length === 0 &&
    logs.length === 0
  ) {
    throw new CharacterArchiveError(
      "Bitte mindestens einen Bereich auswählen.",
    );
  }

  const merged = await PDFDocument.create();
  if (input.includeCharacter) {
    const [talents, bio, campaignRules] = await Promise.all([
      listTalents(),
      getCharacterBioMarkdown(input.characterId),
      listCampaignRules(),
    ]);
    await appendPdf(
      merged,
      await renderCharacterSheetPdf({
        name: character.name,
        rank: character.rank,
        species: character.species,
        portrait: character.portrait,
        portraitCrop: character.portraitCrop,
        stats: character.stats,
        talents,
        campaignRules,
        bioMarkdown: bio,
      }),
    );
  }

  for (const document of documents) {
    if (document.kind === "pdf") {
      const object = await getCharacterDocumentBytes(document.r2Key);
      if (!object)
        throw new CharacterArchiveError(
          `„${document.fileName}“ fehlt im Speicher.`,
        );
      await appendPdf(merged, object.body);
    } else {
      await appendPdf(
        merged,
        await renderCharacterArchiveTextPdf({
          title: document.fileName,
          kind: document.kind,
          text: document.extractedText ?? "",
        }),
      );
    }
  }

  const [requestingUser, baseUrl] = await Promise.all([
    getUserById(input.userId),
    getBaseUrl(),
  ]);
  for (const slug of missionSlugs) {
    const book = await getMissionBook(slug);
    if (!book || book.isDraft) {
      throw new CharacterArchiveError(
        "Mindestens eine Mission ist nicht mehr verfügbar.",
      );
    }
    await appendPdf(
      merged,
      await renderMissionBookPdf({
        book,
        campaignTitle: "Neo Archive",
        requestedBy: requestingUser?.name ?? null,
        baseUrl,
      }),
    );
  }

  for (const log of logs) {
    await appendPdf(
      merged,
      await renderContentPdf(
        {
          title: log.title,
          filenameBase: log.slug,
          frontmatter: {
            type: "mission-log",
            mission: log.mission_slug,
            mission_title: log.mission_title,
            author: log.author_name,
            session_nr: log.session_nr,
            log_date: log.log_date,
          },
          bodyMarkdown: log.source_md ?? "",
        },
        "mission_log",
      ),
    );
  }

  merged.setTitle(`Charakterarchiv ${character.name}`);
  merged.setAuthor("Neo Archive");
  return {
    buffer: Buffer.from(await merged.save()),
    characterName: character.name,
  };
}
