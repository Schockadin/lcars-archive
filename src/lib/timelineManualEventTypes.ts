export interface ManualEventForEdit {
  id: number;
  createdAt?: string;
  date: string;
  title: string;
  teaser: string | null;
  detail: string | null;
  category: string;
  characterIds: number[];
  characterNames: string[];
}
