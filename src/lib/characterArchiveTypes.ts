export interface CharacterArchiveLogOption {
  id: number;
  slug: string;
  title: string;
  logDate: string | null;
  sessionNr: number | null;
  isDraft: boolean;
}

export interface CharacterArchiveMissionOption {
  slug: string;
  title: string;
  canExportWholeMission: boolean;
  logs: CharacterArchiveLogOption[];
}
