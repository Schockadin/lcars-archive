export interface ManualEventForEdit {
  id: number;
  date: string;
  title: string;
  teaser: string | null;
  detail: string | null;
  category: string;
  characterIds: number[];
  characterNames: string[];
}
