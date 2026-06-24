// src/types/missionLog.ts
export interface MissionLogPreview {
  id: number;
  slug: string;
  title: string;
  session_nr: number | null;
  log_date: string | null;
  mission_slug: string;
  mission_title: string;
  summary: string;
}
