export type MissionStatus = "active" | "completed" | "failed" | "abandoned";

export interface Mission {
  id: number;
  slug: string;
  title: string;
  status: MissionStatus;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MissionMetaData {
  tags: string[];
  body: string | null;
}

// Listenvorschau für die Missions-Chronik: schlanke Felder + Anzahl
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

// Einzelnes Log in der Detail-Liste neben/über der Mission.
export interface MissionLogItem {
  id: number;
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  mission_id: number;
  mission_slug: string;
  author_id: number | null;
  author_name: string | null;
  author_slug: string | null;
  // Log-Text (HTML) zum Aufklappen in der Liste.
  content: string;
}
