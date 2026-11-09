import { describe, expect, it } from "vitest";
import {
  getAdminContentStats,
  recordContentView,
} from "@/lib/contentViews";
import { insertUser } from "./helpers";

describe("content view statistics", () => {
  it("records the viewer and content snapshot for the admin dashboard", async () => {
    const user = await insertUser({
      name: "Stats Reader",
      email: "stats-reader@example.test",
    });

    await recordContentView({
      userId: user.id,
      contentType: "mission_log",
      contentSlug: "first-contact-report",
      contentTitle: "Erster Kontakt",
      routePath: "/chronologie/mission/first-contact/first-contact-report",
    });

    const stats = await getAdminContentStats();
    expect(stats.totalAccounts).toBe(1);
    expect(stats.signupsLastWeek).toBe(1);
    expect(stats.viewsLastWeek).toBe(1);
    expect(stats.uniqueViewersLastWeek).toBe(1);
    expect(stats.viewsByType).toEqual([
      { contentType: "mission_log", count: 1 },
    ]);
    expect(stats.daily).toHaveLength(7);
    expect(stats.daily.reduce((sum, day) => sum + day.views, 0)).toBe(1);
    expect(stats.recentViews[0]).toMatchObject({
      userName: "Stats Reader",
      userEmail: "stats-reader@example.test",
      contentType: "mission_log",
      contentSlug: "first-contact-report",
      contentTitle: "Erster Kontakt",
      routePath: "/chronologie/mission/first-contact/first-contact-report",
    });
  });
});
