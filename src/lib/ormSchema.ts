import {
  boolean,
  customType,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Der geteilte postgres.js-Client parst JSONB bereits selbst. Drizzles
// Standard-jsonb-Spalte würde das Ergebnis ein zweites Mal JSON.parse'n.
const existingJsonb = customType<{ data: unknown; driverData: string }>({
  dataType: () => "jsonb",
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) =>
    typeof value === "string" ? JSON.parse(value) : value,
});

// Typisierte Projektionen der bereits vorhandenen Tabellen. DDL und
// Migrationen bleiben in scripts/schema.sql und scripts/migrate-*.sql;
// diese Abbildungen erzeugen oder verändern keine Datenbankobjekte.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => users.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  portrait: text("portrait"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const characterDocuments = pgTable("character_documents", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").references(() => characters.id, {
    onDelete: "cascade",
  }),
  ownerUserId: integer("owner_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  fileKind: text("file_kind").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contentImages = pgTable("content_images", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  r2Key: text("r2_key").notNull().unique(),
  contentMime: text("content_mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userImages = pgTable("user_images", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  contentMime: text("content_mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sourceImageKey: text("source_image_key"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campaignSettings = pgTable("campaign_settings", {
  id: boolean("id").primaryKey().default(true),
  sessionDefaultWeekday: smallint("session_default_weekday")
    .notNull()
    .default(0),
  sessionDefaultWeekParity: text("session_default_week_parity")
    .notNull()
    .default("odd"),
  sessionDefaultTime: text("session_default_time").notNull().default("16:00"),
  sessionDefaultLocation: text("session_default_location")
    .notNull()
    .default("David"),
  advancementRules: existingJsonb("advancement_rules"),
  technomageSpellRules: existingJsonb("technomage_spell_rules"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
