"use server";
import { getSession } from "@/lib/session";
import {
  getFollowStatus,
  setBookmark,
  setSubscription,
  type FollowTargetType,
} from "@/lib/follows";

export interface FollowState {
  loggedIn: boolean;
  bookmarked: boolean;
  subscribed: boolean;
}

const LOGGED_OUT_STATE: FollowState = {
  loggedIn: false,
  bookmarked: false,
  subscribed: false,
};

// Nutzt bewusst getSession() (reine Cookie-Prüfung) statt getCurrentUser()/
// verifySession(), die bei fehlender Session auf /login umleiten würden —
// anonyme Besucher auf öffentlichen Missions-/Archiv-Seiten sollen einfach
// keine Bookmark/Abo-Buttons sehen, nicht umgeleitet werden.
export async function getFollowState(
  targetType: FollowTargetType,
  targetSlug: string,
): Promise<FollowState> {
  const session = await getSession();
  if (!session) return LOGGED_OUT_STATE;

  const status = await getFollowStatus(session.userId, targetType, targetSlug);
  return { loggedIn: true, ...status };
}

export async function toggleBookmark(
  targetType: FollowTargetType,
  targetSlug: string,
  value: boolean,
): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  await setBookmark(session.userId, targetType, targetSlug, value);
  return value;
}

export async function toggleSubscription(
  targetType: FollowTargetType,
  targetSlug: string,
  value: boolean,
): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  await setSubscription(session.userId, targetType, targetSlug, value);
  return value;
}
