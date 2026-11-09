export const CONTENT_VIEW_TYPES = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
] as const;

export type ContentViewType = (typeof CONTENT_VIEW_TYPES)[number];

export interface ContentViewEventInput {
  userId: number;
  contentType: ContentViewType;
  contentSlug: string;
  contentTitle: string;
  routePath: string;
}

export interface ContentViewEvent {
  id: number;
  viewedAt: string;
  userName: string;
  userEmail: string;
  contentType: ContentViewType;
  contentSlug: string;
  contentTitle: string;
  routePath: string;
}

export interface AdminContentStats {
  totalAccounts: number;
  signupsLastWeek: number;
  viewsLastWeek: number;
  uniqueViewersLastWeek: number;
  daily: { date: string; views: number; signups: number }[];
  viewsByType: { contentType: ContentViewType; count: number }[];
  recentViews: ContentViewEvent[];
}
