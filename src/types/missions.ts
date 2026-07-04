export type MissionStatus = "active" | "completed" | "failed" | "abandoned";

export interface MissionMetaData {
  tags: string[];
  body: string | null;
}

export interface Mission {
  id: number;
  slug: string;
  title: string;
  status: MissionStatus;
  started_at: string | null;
  ended_at: string | null;
  metadata: MissionMetaData;
  created_at: string;
  updated_at: string;
}

// Autor eines Mission-Logs (für die Filterung der Übersicht). Missionen
// selbst haben keinen Autor — er wird aus den zugehörigen Logs aggregiert.
export interface MissionAuthor {
  name: string;
  slug: string | null;
}

// Listenvorschau für die Missions-Übersicht: schlanke Felder + Anzahl
// der zugehörigen Mission-Logs (per JOIN ermittelt) + die distinkten
// Log-Autoren (für den Autor-Filter).
export interface MissionPreview {
  id: number;
  slug: string;
  title: string;
  status: MissionStatus;
  started_at: string | null;
  ended_at: string | null;
  metadata: MissionMetaData;
  log_count: number;
  authors: MissionAuthor[];
}

// Detailansicht einer Mission (Synopsis + Metadaten).
export interface MissionDetail {
  id: number;
  slug: string;
  title: string;
  status: MissionStatus;
  started_at: string | null;
  ended_at: string | null;
  metadata: MissionMetaData;
  updated_at: string;
  ownerUserId: number | null;
  // Roher Markdown-Body der Synopsis (source_md) — Grundlage für die
  // inline-Bearbeitung auf der Mission-Detailseite (MissionSynopsisEditor).
  sourceMarkdown: string | null;
}

// Log in der Liste links (ohne content — schlank gehalten).
export interface MissionLogListItem {
  id: number;
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  author_name: string | null;
  author_slug: string | null;
}

// Vollständiges Log inkl. content + Mission-Referenz.
export interface MissionLogDetail {
  id: number;
  slug: string;
  title: string;
  content: string;
  session_nr: number | null;
  log_date: string | null;
  author_name: string | null;
  author_slug: string | null;
  mission_id: number;
  mission_slug: string;
  mission_title: string;
  visibility: "private" | "gm" | "public";
  ownerUserId: number | null;
}

// Schlanke Pfad-Info für die Sitemap.
export interface LogPath {
  mission_slug: string;
  log_slug: string;
  updated_at: string;
}

// Ziel für die Vor-/Zurück-Navigation zwischen Logs desselben Autors.
export interface LogNavItem {
  slug: string;
  mission_slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
}

// Nachbar-Logs desselben Autors (chronologisch: Datum → Session-Nr).
// prev = älter, next = neuer; jeweils null, wenn es keinen Nachbarn gibt.
export interface LogNavNeighbors {
  prev: LogNavItem | null;
  next: LogNavItem | null;
}
