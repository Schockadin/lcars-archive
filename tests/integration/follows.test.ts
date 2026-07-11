import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  setBookmark,
  setSubscription,
  getBookmarkedContent,
  getFollowStatuses,
  getUserSubscribers,
} from "@/lib/follows";
import { insertUser, insertCharacter, insertMission } from "./helpers";

describe("setBookmark", () => {
  it("creates a content_follows row when bookmarking", async () => {
    const user = await insertUser();
    const mission = await insertMission();

    await setBookmark(user.id, "mission", mission.slug, true);

    const [row] = await sql<{ bookmarked_at: Date | null }[]>`
      SELECT bookmarked_at FROM content_follows
      WHERE user_id = ${user.id} AND target_type = 'mission' AND target_slug = ${mission.slug}
    `;
    expect(row.bookmarked_at).not.toBeNull();
  });

  it("deletes the row entirely when un-bookmarking with no subscription set", async () => {
    const user = await insertUser();
    const mission = await insertMission();
    await setBookmark(user.id, "mission", mission.slug, true);

    await setBookmark(user.id, "mission", mission.slug, false);

    const rows = await sql`
      SELECT 1 FROM content_follows
      WHERE user_id = ${user.id} AND target_type = 'mission' AND target_slug = ${mission.slug}
    `;
    expect(rows).toHaveLength(0);
  });

  it("keeps the row when un-bookmarking but a subscription is still set", async () => {
    const user = await insertUser();
    const mission = await insertMission();
    await setBookmark(user.id, "mission", mission.slug, true);
    await setSubscription(user.id, "mission", mission.slug, true);

    await setBookmark(user.id, "mission", mission.slug, false);

    const [row] = await sql<{ bookmarked_at: Date | null; subscribed_at: Date | null }[]>`
      SELECT bookmarked_at, subscribed_at FROM content_follows
      WHERE user_id = ${user.id} AND target_type = 'mission' AND target_slug = ${mission.slug}
    `;
    expect(row.bookmarked_at).toBeNull();
    expect(row.subscribed_at).not.toBeNull();
  });
});

describe("setSubscription", () => {
  it("creates a content_follows row when subscribing", async () => {
    const user = await insertUser();
    const character = await insertCharacter();

    await setSubscription(user.id, "character", character.slug, true);

    const [row] = await sql<{ subscribed_at: Date | null }[]>`
      SELECT subscribed_at FROM content_follows
      WHERE user_id = ${user.id} AND target_type = 'character' AND target_slug = ${character.slug}
    `;
    expect(row.subscribed_at).not.toBeNull();
  });
});

describe("getBookmarkedContent", () => {
  it("only returns visible content: public entries and the viewer's own private ones", async () => {
    const user = await insertUser();
    const otherOwner = await insertUser();
    const ownPrivate = await insertCharacter({
      playerId: user.id,
      visibility: "private",
      name: "Eigener Charakter",
    });
    const foreignPrivate = await insertCharacter({
      playerId: otherOwner.id,
      visibility: "private",
      name: "Fremder Charakter",
    });
    const publicChar = await insertCharacter({
      visibility: "public",
      name: "Öffentlicher Charakter",
    });

    await setBookmark(user.id, "character", ownPrivate.slug, true);
    await setBookmark(user.id, "character", foreignPrivate.slug, true);
    await setBookmark(user.id, "character", publicChar.slug, true);

    const result = await getBookmarkedContent(user.id);

    expect(result.map((r) => r.slug).sort()).toEqual(
      [ownPrivate.slug, publicChar.slug].sort(),
    );
  });
});

describe("getFollowStatuses", () => {
  it("batches lookups for multiple slugs at once", async () => {
    const user = await insertUser();
    const missionA = await insertMission();
    const missionB = await insertMission();
    const missionC = await insertMission();
    await setBookmark(user.id, "mission", missionA.slug, true);
    await setSubscription(user.id, "mission", missionB.slug, true);

    const result = await getFollowStatuses(user.id, "mission", [
      missionA.slug,
      missionB.slug,
      missionC.slug,
    ]);

    expect(result[missionA.slug]).toEqual({ bookmarked: true, subscribed: false });
    expect(result[missionB.slug]).toEqual({ bookmarked: false, subscribed: true });
    expect(result[missionC.slug]).toBeUndefined();
  });

  it("returns an empty object for an empty slug list", async () => {
    const user = await insertUser();

    const result = await getFollowStatuses(user.id, "mission", []);

    expect(result).toEqual({});
  });
});

describe("getUserSubscribers", () => {
  it("returns only users subscribed to the given user slug", async () => {
    const target = await insertUser();
    const subscriber = await insertUser();
    const nonSubscriber = await insertUser();
    await setSubscription(subscriber.id, "user", target.slug, true);

    const result = await getUserSubscribers(target.slug);

    expect(result.map((s) => s.id)).toEqual([subscriber.id]);
    expect(result.map((s) => s.id)).not.toContain(nonSubscriber.id);
  });

  it("does not include a bookmark-only follow (not subscribed)", async () => {
    const target = await insertUser();
    const bookmarker = await insertUser();
    await setBookmark(bookmarker.id, "user", target.slug, true);

    const result = await getUserSubscribers(target.slug);

    expect(result).toEqual([]);
  });
});
