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
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata: MissionMetaData;
  created_at: string;
  updated_at: string;
}

// Listenvorschau für die Missions-Übersicht: schlanke Felder + Anzahl
// der zugehörigen Mission-Logs (per JOIN ermittelt).
export interface MissionPreview {
  id: number;
  slug: string;
  title: string;
  status: MissionStatus;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata: MissionMetaData;
  log_count: number;
}

// Detailansicht einer Mission (Synopsis + Metadaten).
export interface MissionDetail {
  id: number;
  slug: string;
  title: string;
  status: MissionStatus;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata: MissionMetaData;
  updated_at: string;
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
}

// Schlanke Pfad-Info für die Sitemap.
export interface LogPath {
  mission_slug: string;
  log_slug: string;
  updated_at: string;
}
