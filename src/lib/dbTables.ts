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
    "updated_at", "deleted_at", "is_draft", "character_color",
  ],
  character_documents: [
    "id", "character_id", "r2_key", "file_name", "file_kind", "content_mime",
    "size_bytes", "extracted_text", "uploaded_by", "created_at",
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
    "updated_at", "owner_user_id", "deleted_at", "is_draft",
    "session_id",
  ],
  archive_entries: [
    "id", "slug", "title", "category", "content", "tags", "metadata",
    "source_md", "frontmatter", "created_at", "updated_at", "dialogue_open",
    "owner_user_id", "deleted_at", "is_draft",
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
    "href", "origin", "detail", "teaser", "confidence", "created_by", "created_at",
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
    "id", "target_type", "title", "owner_user_id",
    "deleted_by", "deleted_at",
  ],
  content_follows: [
    "id", "user_id", "target_type", "target_slug", "bookmarked_at",
    "subscribed_at", "created_at",
  ],
  content_embeddings: [
    "id", "content_type", "content_id", "chunk_index", "chunk_text",
    "owner_id", "is_draft", "is_active", "title", "slug",
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
    "dashboard_prefs",
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
    "app_version", "deploy_context", "commit_ref", "created_at",
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

// Die Inhaltstabellen: sie sieht jeder mit sql_read, alles andere
// verlangt zusätzlich db_view_system_tables.
export const CONTENT_TABLES: readonly TableName[] = [
  "characters",
  "character_documents",
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

// Was ins DB-Backup wandert — und, gleich darunter, was bewusst draußen
// bleibt. Zusammen ergeben beide Listen ALLE Tabellen; dbTables.test.ts prüft
// genau das. Eine neue Tabelle zwingt damit zu einer Entscheidung, statt
// stillschweigend aus dem Backup zu fallen.
//
// Bis v1 des Dateiformats war die Liste eine enge Auswahl, und das Erweitern
// galt als riskant: Der Restore leerte JEDE genannte Tabelle, eine ältere
// Datei kannte die neu aufgenommene aber nicht — sie wäre danach leer
// gewesen. Seit v2 leert der Restore nur noch, was die Datei auch mitbringt
// (siehe importDatabaseBackup), und die Sorge entfällt.
//
// Dass die Auswahl eng blieb, war seinerseits nicht folgenlos: TRUNCATE
// CASCADE greift auf alles über, was per Fremdschlüssel auf eine geleerte
// Tabelle zeigt. character_ap_entries, game_session_characters,
// planned_session_characters und timeline_event_characters hängen an
// characters — sie wurden beim Restore mit geleert und mangels Daten in der
// Datei nie wieder gefüllt. Das AP-Konto einer Runde war nach einem Restore
// also weg.
//
// Reihenfolge: Eltern vor Kind — die Inserts laufen in dieser Reihenfolge,
// ein Kind vor seinem Elternteil liefe in eine Fremdschlüssel-Verletzung und
// damit in einen komplett zurückgerollten Restore. dbTables.test.ts liest die
// Fremdschlüssel aus scripts/schema.sql und prüft die Reihenfolge nach.
export const BACKUP_TABLES = [
  // ── Inhalte ──────────────────────────────────────────────────────
  // game_sessions gehört inhaltlich in den Block „Kampagne und Regelwerk"
  // weiter unten, steht aber hier ganz vorn: mission_logs.session_id und
  // character_ap_entries.session_id zeigen darauf. Weiter unten stehend
  // scheiterte der Restore jeder Runde, die Logbücher oder AP-Gutschriften
  // einer Spielsitzung zugeordnet hat.
  "game_sessions",
  "characters",
  "character_documents",
  "missions",
  "mission_participants",
  "mission_logs",
  "archive_entries",
  "archive_links",
  "dialogue_messages",
  "dialogue_npc_speakers",
  "dialogue_reservations",
  "dialogue_reservation_notify_requests",
  "timeline_events",
  "timeline_event_characters",
  "content_images",
  "content_notes",
  "content_revisions",
  "content_deletions",
  "content_follows",

  // ── Kampagne und Regelwerk ───────────────────────────────────────
  "character_ap_entries",
  "campaign_settings",
  "campaign_rules",
  "talents",
  "focuses",
  // game_sessions steht oben im Inhalte-Block, siehe dort.
  "game_session_characters",
  "planned_sessions",
  "planned_session_rsvps",
  "planned_session_characters",

  // ── Konten und Rechte ────────────────────────────────────────────
  // roles: die Rollen-Vorgaben aus /admin/permissions. users.role und
  // users.additional_roles verweisen als freier Text darauf (kein
  // Fremdschlüssel, siehe schema.sql) — ohne die Tabelle zeigten die
  // wiederhergestellten Konten auf Rollen, die es nicht mehr gibt. Stand
  // bisher in KEINEM Backup, auch nicht im Konten-Backup (userBackup.ts,
  // das nur users sichert).
  "roles",
  "password_setup_tokens",
  "push_subscriptions",
] as const satisfies readonly TableName[];

// Was NICHT ins Backup gehört, mit Grund. Zusammen mit BACKUP_TABLES deckt
// diese Liste alle Tabellen ab (geprüft in dbTables.test.ts) — wer eine
// Tabelle anlegt, muss sie hier oder dort eintragen.
export const BACKUP_EXCLUDED_TABLES = [
  // Konten haben ihr eigenes, parallel laufendes Backup mit anderer
  // Semantik: Upsert per E-Mail statt vollem Replace (src/lib/userBackup.ts).
  "users",

  // Betriebsdaten. Sie beschreiben den Betrieb, nicht den Stand der
  // Kampagne — und ein Restore soll weder alte Sperren noch alte Protokolle
  // zurückholen.
  "login_attempts",
  "password_reset_requests",
  "rag_requests",
  "admin_audit_log",
  "error_logs",

  // Pro Person gelesene Neuigkeiten: hängen an Konten, die dieses Backup
  // nicht anfasst, und sind nach einem Restore ohnehin bedeutungslos.
  "news_seen",

  // Entsteht neu aus dem Inhalt (Einbettungen, src/lib/embeddingSync.ts) —
  // eine Kopie wäre nur groß, nicht wertvoll.
  "content_embeddings",
] as const satisfies readonly TableName[];

export type BackupTableName = (typeof BACKUP_TABLES)[number];
