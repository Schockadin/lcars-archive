import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import { logAdminAction, listRecentAdminActions } from "@/lib/auditLog";
import { insertUser } from "./helpers";

describe("logAdminAction / listRecentAdminActions", () => {
  it("records action, target, details and ip, and resolves actor/target names via the join", async () => {
    const admin = await insertUser({ name: "Admin Anna", role: "admin" });
    const target = await insertUser({ name: "Target Tim" });

    await logAdminAction(
      admin.id,
      "update_role",
      target.id,
      `${target.name}: player → admin`,
      "203.0.113.5",
    );

    const [entry] = await listRecentAdminActions();
    expect(entry).toMatchObject({
      actorId: admin.id,
      actorName: "Admin Anna",
      action: "update_role",
      targetUserId: target.id,
      targetName: "Target Tim",
      details: `${target.name}: player → admin`,
      ip: "203.0.113.5",
    });
  });

  it("defaults ip and details to null when omitted", async () => {
    const admin = await insertUser({ role: "admin" });
    const target = await insertUser();

    await logAdminAction(admin.id, "force_logout", target.id);

    const [entry] = await listRecentAdminActions();
    expect(entry.ip).toBeNull();
    expect(entry.details).toBeNull();
  });

  it("supports the update_profile action (added for the /admin/[id]/edit audit-log fix)", async () => {
    const admin = await insertUser({ role: "admin" });
    const target = await insertUser();

    await logAdminAction(
      admin.id,
      "update_profile",
      target.id,
      "Old Name <old@example.test> → New Name <new@example.test>",
      null,
    );

    const [entry] = await listRecentAdminActions();
    expect(entry.action).toBe("update_profile");
  });

  it("rejects an action outside the CHECK constraint's allowed set, even bypassing logAdminAction", async () => {
    // Regression: admin_audit_log.action hatte vorher keinen DB-CHECK,
    // anders als jede andere enum-artige Spalte im Schema — dieser Test
    // verifiziert direkt gegen die DB, nicht nur gegen den TS-Typ.
    const admin = await insertUser({ role: "admin" });
    await expect(
      sql`INSERT INTO admin_audit_log (actor_id, action) VALUES (${admin.id}, 'not_a_real_action')`,
    ).rejects.toThrow();
  });

  it("keeps the details snapshot readable after the target user is deleted, even though target_user_id/targetName become null", async () => {
    const admin = await insertUser({ role: "admin" });
    const target = await insertUser({ name: "Doomed Dana", email: "dana@example.test" });

    await logAdminAction(
      admin.id,
      "delete_user",
      target.id,
      `${target.name} <${target.email}>`,
      "203.0.113.9",
    );
    await sql`DELETE FROM users WHERE id = ${target.id}`;

    const [entry] = await listRecentAdminActions();
    expect(entry.targetUserId).toBeNull();
    expect(entry.targetName).toBeNull();
    expect(entry.details).toBe("Doomed Dana <dana@example.test>");
  });

  it("orders by most recent first and respects the limit", async () => {
    const admin = await insertUser({ role: "admin" });
    const target = await insertUser();

    await logAdminAction(admin.id, "create_user", target.id, "first");
    await logAdminAction(admin.id, "reset_password", target.id, "second");
    await logAdminAction(admin.id, "force_logout", target.id, "third");

    const entries = await listRecentAdminActions(2);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.details)).toEqual(["third", "second"]);
  });
});
