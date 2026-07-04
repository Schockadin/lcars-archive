import "server-only";
import matter from "gray-matter";
import sql from "@/lib/db";
import { upsertVaultFile } from "@/lib/githubVault";

// Rückrichtung zum bisherigen Ingest (scripts/ingest/*, Vault → DB): die DB
// ist jetzt Source of Truth (siehe docs/content-creation-strategy.md), der
// Vault nur noch ein aus der DB generiertes Backup. exportContentToVault()
// baut aus dem aktuellen DB-Stand für jeden Inhalt die Markdown-Datei neu
// und committet sie (create-or-update) ins Vault-Repo. Aufrufbar sowohl aus
// einer Server Action (Admin-Panel-Button, src/app/users/vaultExportActions.ts)
// als auch von einem geschützten API-Endpoint (src/app/api/vault-export/route.ts),
// der später von einem Cronjob getriggert werden kann — beide teilen sich
// exakt diese eine Funktion, keine Duplizierung der Export-Logik.
//
// Bewusst nur "upsert", kein Abgleich/Löschen verwaister Dateien: anders als
// bei Mission-Logs (fester Pfad Missionen/<mission-slug>/<slug>.md) ist beim
// Archiv nicht rekonstruierbar, in welchem Unterordner eine gelöschte Datei
// ursprünglich lag (kein Pfad in der DB gespeichert) — ein automatischer
// Abgleich könnte dort falsche Dateien treffen. Wird ein Inhalt in der DB
// gelöscht, bleibt seine Vault-Datei bis zum manuellen Aufräumen bestehen.

export interface VaultExportFile {
  path: string;
  content: string;
}

export interface VaultExportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

// Kategorie → Vault-Ordner für neu generierte Archiv-Dateien. Nur der
// Ablageort für neue Exporte — welche Kategorie ein Eintrag hat, bestimmt
// beim nächsten Re-Ingest immer das explizite `category`-Feld im
// Frontmatter (siehe buildArchiveEntryFrontmatter unten), nicht der Ordner.
const CATEGORY_FOLDER: Record<string, string> = {
  dialogue: "Dialoge",
  npc: "NPCs",
  person: "Personen",
  location: "Orte",
  item: "Items",
  faction: "Fraktionen",
  theory: "Theorien",
  event: "Ereignisse",
  species: "Spezies",
  other: "Lore",
};

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

interface MissionExportRow {
  slug: string;
  title: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  sourceMarkdown: string | null;
  ownerSlug: string | null;
}

async function getMissionsForExport(): Promise<MissionExportRow[]> {
  return sql<MissionExportRow[]>`
    SELECT
      m.slug,
      m.title,
      m.status,
      m.started_at::text AS "startedAt",
      m.ended_at::text   AS "endedAt",
      COALESCE(m.metadata->'tags', '[]'::jsonb) AS tags,
      m.source_md        AS "sourceMarkdown",
      u.slug              AS "ownerSlug"
    FROM missions m
    LEFT JOIN users u ON u.id = m.owner_user_id
  `;
}

function buildMissionFile(row: MissionExportRow): VaultExportFile {
  const frontmatter: Record<string, unknown> = {
    type: "mission",
    slug: row.slug,
    title: row.title,
    status: row.status,
  };
  if (row.startedAt) frontmatter.started_at = row.startedAt;
  if (row.endedAt) frontmatter.ended_at = row.endedAt;
  if (row.tags.length) frontmatter.tags = row.tags;
  if (row.ownerSlug) frontmatter.owner = row.ownerSlug;

  return {
    path: `Missionen/${row.slug}/index.md`,
    content: matter.stringify(row.sourceMarkdown ?? "", frontmatter),
  };
}

interface MissionLogExportRow {
  slug: string;
  missionSlug: string;
  title: string;
  authorSlug: string | null;
  sessionNr: number | null;
  logDate: string | null;
  sourceMarkdown: string | null;
  ownerSlug: string | null;
}

async function getMissionLogsForExport(): Promise<MissionLogExportRow[]> {
  return sql<MissionLogExportRow[]>`
    SELECT
      ml.slug,
      m.slug             AS "missionSlug",
      ml.title,
      c.slug             AS "authorSlug",
      ml.session_nr      AS "sessionNr",
      ml.log_date::text  AS "logDate",
      ml.source_md       AS "sourceMarkdown",
      u.slug             AS "ownerSlug"
    FROM mission_logs ml
    JOIN missions m       ON m.id = ml.mission_id
    LEFT JOIN characters c ON c.id = ml.author_id
    LEFT JOIN users u      ON u.id = ml.owner_user_id
  `;
}

function buildMissionLogFile(row: MissionLogExportRow): VaultExportFile {
  const frontmatter: Record<string, unknown> = {
    type: "mission-log",
    title: row.title,
    mission: row.missionSlug,
    author: row.authorSlug,
    session_nr: row.sessionNr,
  };
  if (row.logDate) frontmatter.log_date = row.logDate;
  if (row.ownerSlug) frontmatter.owner = row.ownerSlug;

  return {
    path: `Missionen/${row.missionSlug}/${row.slug}.md`,
    content: matter.stringify(row.sourceMarkdown ?? "", frontmatter),
  };
}

interface CharacterExportRow {
  slug: string;
  name: string;
  status: string;
  sourceMarkdown: string | null;
  frontmatter: Record<string, unknown> | string;
}

async function getCharactersForExport(): Promise<CharacterExportRow[]> {
  return sql<CharacterExportRow[]>`
    SELECT slug, name, status, source_md AS "sourceMarkdown", frontmatter
    FROM characters
  `;
}

// Charaktere/Archiv-Einträge haben (anders als Missionen/Mission-Logs)
// keinen Erstellungs-/Bearbeitungsweg über die App — ihr frontmatter/
// source_md stammt unverändert vom letzten Vault-Ingest. type/slug/title
// (bzw. name/status/category) werden trotzdem aus den maßgeblichen
// DB-Spalten überschrieben statt blind dem gespeicherten Frontmatter zu
// vertrauen: das ursprüngliche File konnte z.B. die category allein aus dem
// Vault-Ordner ableiten (siehe FOLDER_CATEGORY in scripts/ingest/archive.ts)
// ohne eigenes category-Feld — der Export legt die Datei aber in einen neu
// gewählten Ordner (Pfad ist nicht in der DB gespeichert), ein fehlendes
// category-Feld würde beim nächsten Re-Ingest dann die falsche Kategorie
// erraten.
function buildCharacterFile(row: CharacterExportRow): VaultExportFile {
  const frontmatter = {
    ...parseJson(row.frontmatter),
    type: "character",
    slug: row.slug,
    name: row.name,
    status: row.status,
  };

  return {
    path: `Charaktere/${row.slug}.md`,
    content: matter.stringify(row.sourceMarkdown ?? "", frontmatter),
  };
}

interface ArchiveEntryExportRow {
  slug: string;
  title: string;
  category: string;
  sourceMarkdown: string | null;
  frontmatter: Record<string, unknown> | string;
  ownerSlug: string | null;
}

async function getArchiveEntriesForExport(): Promise<ArchiveEntryExportRow[]> {
  return sql<ArchiveEntryExportRow[]>`
    SELECT
      e.slug,
      e.title,
      e.category,
      e.source_md   AS "sourceMarkdown",
      e.frontmatter,
      u.slug        AS "ownerSlug"
    FROM archive_entries e
    LEFT JOIN users u ON u.id = e.owner_user_id
  `;
}

function buildArchiveEntryFile(row: ArchiveEntryExportRow): VaultExportFile {
  const frontmatter: Record<string, unknown> = {
    ...parseJson(row.frontmatter),
    type: "archive",
    slug: row.slug,
    title: row.title,
    category: row.category,
  };
  if (row.ownerSlug) frontmatter.owner = row.ownerSlug;
  else delete frontmatter.owner;

  const folder = CATEGORY_FOLDER[row.category] ?? "Lore";
  return {
    path: `Archiv/${folder}/${row.slug}.md`,
    content: matter.stringify(row.sourceMarkdown ?? "", frontmatter),
  };
}

// Baut die Markdown-Dateien für den kompletten aktuellen DB-Stand — ohne
// I/O gegen GitHub, damit sich die reine Generierung isoliert testen/
// inspizieren lässt.
export async function buildVaultExportFiles(): Promise<VaultExportFile[]> {
  const [missions, missionLogs, characters, archiveEntries] =
    await Promise.all([
      getMissionsForExport(),
      getMissionLogsForExport(),
      getCharactersForExport(),
      getArchiveEntriesForExport(),
    ]);

  return [
    ...missions.map(buildMissionFile),
    ...missionLogs.map(buildMissionLogFile),
    ...characters.map(buildCharacterFile),
    ...archiveEntries.map(buildArchiveEntryFile),
  ];
}

export interface VaultExportFileResult {
  path: string;
  created: boolean;
  error?: string;
}

// Committet eine (kleine) Menge Dateien ins Vault-Repo — sequenziell, nicht
// parallel: die GitHub Contents API braucht pro Datei zwei Requests
// (SHA-Check + PUT), Parallelisierung würde bei größeren Vaults schnell in
// GitHubs sekundäre Rate-Limits laufen.
//
// Bewusst in Batches statt in einem Rutsch für den ganzen Vault: ein
// einzelner Server-Aufruf über hunderte Dateien reißt auf Netlify leicht die
// Function-Timeout-Grenze (die Verbindung bricht dann ergebnislos ab, ohne
// dass der Browser überhaupt eine Antwort bekommt). Der Client
// (VaultExportPanel.tsx) ruft diese Funktion deshalb wiederholt mit kleinen
// Häppchen auf und aktualisiert dazwischen eine Fortschrittsanzeige.
export async function commitVaultExportBatch(
  files: VaultExportFile[],
): Promise<VaultExportFileResult[]> {
  const results: VaultExportFileResult[] = [];

  for (const file of files) {
    try {
      const { created } = await upsertVaultFile({
        path: file.path,
        content: file.content,
        message: `Vault-Backup: ${file.path}`,
      });
      results.push({ path: file.path, created });
    } catch (err) {
      results.push({
        path: file.path,
        created: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

// Weiterhin als ein-Aufruf-Variante für den nicht-interaktiven Cron-Pfad
// (POST /api/vault-export) — dort gibt es keine Fortschrittsanzeige, die
// Batches oben sind ausschließlich für den Admin-Panel-Button gedacht.
export async function exportContentToVault(): Promise<VaultExportResult> {
  const files = await buildVaultExportFiles();
  const fileResults = await commitVaultExportBatch(files);

  const result: VaultExportResult = {
    total: files.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const fileResult of fileResults) {
    if (fileResult.error) {
      result.failed++;
      result.errors.push(`${fileResult.path}: ${fileResult.error}`);
    } else if (fileResult.created) {
      result.created++;
    } else {
      result.updated++;
    }
  }

  return result;
}
