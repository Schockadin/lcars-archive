// Die Tabellen der Datenbank als EINE deklarative Liste — dieselbe Idee wie
// der Feldkatalog der Charakterwerte (src/lib/characterStats.ts): eine Quelle,
// aus der sich alles speist, das Tabellen kennen muss.
//
// Bewusst OHNE "server-only" und ohne DB-Import: die Liste ist reine Daten und
// wird in dbTables.test.ts gegen scripts/schema.sql geprüft — genau das hält
// sie aktuell. Vorher hing sie an TABLE_COLUMNS in dbBackup.ts (der
// Backup-Whitelist) und wuchs deshalb nur mit, wenn jemand an das Backup
// dachte: der Tabellen-Browser unter /admin/db zeigte zuletzt 12 von 38
// Tabellen, und in den gezeigten fehlten nachträglich ergänzte Spalten.
//
// Daraus abgeleitet werden:
//   VIEWABLE_TABLES  — was der Tabellen-Browser unter /admin/db anbietet
//   BACKUP_TABLES    — was im DB-Backup steckt (src/lib/dbBackup.ts)

// Spalten je Tabelle, in der Reihenfolge des Schemas.
//
// NICHT enthalten sind die generierten tsvector-Spalten (search_vector,
// title_vector): Postgres füllt sie selbst, sie lassen sich nicht einfügen,
// und als Zelle wären sie eine Wand aus Lexemen. Einzelne weitere Spalten
// fehlen bewusst — siehe OMITTED_COLUMNS unten.
export const DB_TABLE_COLUMNS = {
  // ── Inhalte ──────────────────────────────────────────────────────
  characters: [
    "id", "slug", "name", "status", "player_id", "portrait", "species",
    "rank", "bio", "metadata", "source_md", "frontmatter", "created_at",
    "updated_at", "visibility", "deleted_at", "is_draft", "character_color",
  ],
  missions: [
    "id", "slug", "title", "status", "started_at", "ended_at", "metadata",
    "source_md", "frontmatter", "created_at", "updated_at", "owner_user_id",
    "deleted_at", "is_draft",
  ],
  mission_participants: ["mission_id", "character_id"],
  mission_logs: [
    "id", "slug", "mission_id", "author_id", "title", "content", "log_date",
    "session_nr", "metadata", "source_md", "frontmatter", "created_at",
    "updated_at", "owner_user_id", "visibility", "deleted_at", "is_draft",
    "session_id",
  ],
  archive_entries: [
    "id", "slug", "title", "category", "content", "tags", "metadata",
    "source_md", "frontmatter", "created_at", "updated_at", "dialogue_open",
    "owner_user_id", "visibility", "deleted_at", "is_draft",
  ],
  archive_links: ["source_id", "target_id", "label"],
  dialogue_messages: [
    "id", "archive_entry_id", "character_id", "npc_entry_id",
    "author_user_id", "content", "source_md", "created_at", "edited_at",
    "deleted_at",
  ],
  dialogue_npc_speakers: [
    "archive_entry_id", "npc_entry_id", "user_id", "created_at",
  ],
  dialogue_reservations: [
    "archive_entry_id", "held_by_user_id", "expires_at", "created_at",
  ],
  dialogue_reservation_notify_requests: [
    "archive_entry_id", "user_id", "created_at",
  ],
  timeline_events: [
    "id", "event_date", "title", "category", "source_type", "source_slug",
    "href", "origin", "detail", "confidence", "created_by", "created_at",
  ],
  timeline_event_characters: ["event_id", "character_id"],
  content_images: [
    "id", "content_type", "content_id", "r2_key", "content_mime",
    "size_bytes", "uploaded_by", "created_at",
  ],
  content_notes: [
    "id", "content_type", "content_slug", "author_id", "body", "visibility",
    "created_at", "updated_at",
  ],
  content_revisions: [
    "id", "content_type", "content_id", "title", "source_md", "editor_id",
    "created_at",
  ],
  content_deletions: [
    "id", "target_type", "title", "visibility", "owner_user_id",
    "deleted_by", "deleted_at",
  ],
  content_follows: [
    "id", "user_id", "target_type", "target_slug", "bookmarked_at",
    "subscribed_at", "created_at",
  ],
  content_embeddings: [
    "id", "content_type", "content_id", "chunk_index", "chunk_text",
    "visibility", "owner_id", "is_draft", "is_active", "title", "slug",
    "href", "metadata", "updated_at",
  ],
  news_seen: ["user_id", "target_type", "target_key", "seen_at"],

  // ── Kampagne und Regelwerk ───────────────────────────────────────
  character_ap_entries: [
    "id", "character_id", "amount", "reason", "note", "created_by",
    "created_at", "session_id", "mission_id",
  ],
  campaign_settings: [
    "id", "ingame_year", "updated_at", "advancement_rules",
    "changelog_featured_versions", "changelog_hidden_categories",
  ],
  campaign_rules: [
    "id", "name", "body", "sort_order", "created_by", "created_at",
    "updated_at",
  ],
  talents: [
    "id", "name", "category", "requirement", "description", "is_custom",
    "created_by", "created_at", "updated_at",
  ],
  focuses: [
    "id", "name", "discipline", "description", "is_custom", "created_by",
    "created_at", "updated_at",
  ],
  game_sessions: [
    "id", "session_date", "title", "session_ap", "bonus_ap", "notes",
    "created_by", "created_at", "updated_at",
  ],
  game_session_characters: ["session_id", "character_id"],
  planned_sessions: [
    "id", "scheduled_at", "title", "location", "notes", "created_by",
    "created_at", "updated_at", "game_session_id",
  ],
  planned_session_rsvps: [
    "session_id", "user_id", "response", "note", "updated_at",
  ],
  planned_session_characters: ["session_id", "character_id"],

  // ── Konten, Rechte und Betrieb ───────────────────────────────────
  users: [
    "id", "email", "name", "role", "created_at", "last_login_at",
    "previous_login_at", "last_visit_at", "last_dashboard_visit_at",
    "requires_activation", "is_active", "slug",
    "email_notifications_enabled", "push_notifications_enabled",
    "notify_content_types", "session_version",
    "dialogue_flowing_text_enabled", "editor_spellcheck_enabled",
    "news_kinds", "color_theme", "theme_overrides", "ui_mode", "color_mode",
    "font_sans", "font_mono", "additional_roles", "permission_overrides",
  ],
  roles: [
    "key", "label", "description", "permissions", "is_system", "sort_order",
    "created_at", "updated_at",
  ],
  password_setup_tokens: [
    "id", "user_id", "token_hash", "expires_at", "used_at", "created_at",
  ],
  password_reset_requests: ["id", "email", "ip", "requested_at"],
  login_attempts: ["id", "email", "ip", "succeeded", "attempted_at"],
  rag_requests: ["id", "user_id", "requested_at"],
  admin_audit_log: [
    "id", "actor_id", "action", "target_user_id", "details", "created_at",
    "ip",
  ],
  push_subscriptions: [
    "id", "user_id", "endpoint", "p256dh", "auth", "created_at",
  ],
  error_logs: [
    "id", "digest", "message", "stack", "route_path", "route_type", "method",
    "created_at",
  ],
} as const satisfies Record<string, readonly string[]>;

export type TableName = keyof typeof DB_TABLE_COLUMNS;

export const DB_TABLES = Object.keys(DB_TABLE_COLUMNS) as TableName[];

// Spalten, die es im Schema gibt, die oben aber bewusst FEHLEN — mit Grund,
// damit der Abgleich gegen scripts/schema.sql (dbTables.test.ts) sie nicht als
// vergessen meldet und niemand sie „nachträgt", ohne den Grund zu kennen.
export const OMITTED_COLUMNS: Partial<Record<TableName, readonly string[]>> = {
  // Passwort-Hash: derselbe Grund wie SECRET_COLUMNS im freien SQL-Panel
  // (src/lib/dbInspect.ts) — er soll nirgends in einer Antwort landen.
  users: ["password_hash"],
  // 1536 Fließkommazahlen je Zeile. In einer Tabellenzelle nutzlos, in der
  // Übertragung teuer; der Vektor entsteht ohnehin neu beim Einbetten.
  content_embeddings: ["embedding"],
};

export function tableColumns(table: TableName): readonly string[] {
  return DB_TABLE_COLUMNS[table];
}

// ── Tabellen-Browser unter /admin/db ───────────────────────────────

// Nur einsehbar, wo nichts als Geheimnisse drinsteht: password_setup_tokens
// besteht praktisch aus token_hash. Alles andere ist sichtbar — auch
// Relationstabellen (mission_participants & Co.), deren Zeilen echte
// Zuordnungen sind, und users (ohne Passwort-Hash, siehe OMITTED_COLUMNS;
// Schreibzugriff sperrt PROTECTED_WRITE_TABLES).
export const HIDDEN_FROM_VIEW: readonly TableName[] = ["password_setup_tokens"];

export const VIEWABLE_TABLES: TableName[] = DB_TABLES.filter(
  (table) => !(HIDDEN_FROM_VIEW as readonly string[]).includes(table),
);

// Die vier Inhaltstabellen: sie sieht jeder mit sql_read, alles andere
// verlangt zusätzlich db_view_system_tables.
export const CONTENT_TABLES: readonly TableName[] = [
  "characters",
  "missions",
  "mission_logs",
  "archive_entries",
];

export function isContentTable(table: string): boolean {
  return (CONTENT_TABLES as readonly string[]).includes(table);
}

export function isViewableTable(value: string): value is TableName {
  return (VIEWABLE_TABLES as readonly string[]).includes(value);
}

// ── DB-Backup (src/lib/dbBackup.ts) ────────────────────────────────

// Was ins DB-Backup wandert — eine eigene, ENGERE Auswahl, kein Abfall der
// Browser-Liste. Sie ist hier unverändert geblieben: Der Restore leert jede
// genannte Tabelle (TRUNCATE) und spielt sie neu ein, eine ältere Backup-Datei
// kennt die neu aufgenommene Tabelle aber nicht — sie würde beim
// Zurückspielen also geleert statt wiederhergestellt. Die Liste zu erweitern
// ist deshalb eine eigene Entscheidung samt Versionssprung des Dateiformats
// (DbBackup.version) und nicht Teil des Tabellen-Browsers.
//
// Damit fehlen im Backup derzeit die jüngeren Kampagnen-Tabellen (AP-Konto,
// Talente, Schwerpunkte, Hausregeln, Sessions, Notizen, Fassungen, Bilder).
// users bleibt bewusst draußen: Konten haben ihr eigenes, parallel laufendes
// Backup (src/lib/userBackup.ts). Betriebsdaten (Rate-Limits, Fehler- und
// Audit-Protokolle, gelesene News, Embeddings) gehören ohnehin nicht in einen
// Inhalts-Dump — Embeddings entstehen neu, die Protokolle beschreiben den
// Betrieb, nicht den Stand der Kampagne.
//
// Reihenfolge: Eltern vor Kind (FK-Constraints).
export const BACKUP_TABLES = [
  "characters",
  "missions",
  "mission_participants",
  "mission_logs",
  "archive_entries",
  "archive_links",
  "dialogue_messages",
  "timeline_events",
  "password_setup_tokens",
  "content_follows",
  "push_subscriptions",
  "content_deletions",
  "dialogue_reservations",
  "dialogue_reservation_notify_requests",
] as const satisfies readonly TableName[];

export type BackupTableName = (typeof BACKUP_TABLES)[number];
