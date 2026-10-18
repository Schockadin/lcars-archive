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

  it("lists DB-row edits and the audit entry that undid them", async () => {
    const admin = await insertUser({ role: "admin" });
    const details = JSON.stringify({
      kind: "db_row_update",
      table: "archive_entries",
      pkColumn: "id",
      pkValue: "525",
      columns: ["metadata"],
      before: {
        values: { metadata: { participants: [] } },
        sqlNulls: { metadata: false },
      },
      after: {
        values: { metadata: "serialized value" },
        sqlNulls: { metadata: false },
      },
    });
    const [original] = await sql<{ id: number }[]>`
      INSERT INTO admin_audit_log (actor_id, action, details)
      VALUES (${admin.id}, 'update_db_row', ${details})
      RETURNING id
    `;
    const [undo] = await sql<{ id: number }[]>`
      INSERT INTO admin_audit_log (actor_id, action, details, reverts_audit_id)
      VALUES (${admin.id}, 'undo_db_row', 'undo details', ${original.id})
      RETURNING id
    `;

    const entries = await listRecentAdminActions();
    const originalEntry = entries.find((entry) => entry.id === original.id);
    expect(originalEntry).toMatchObject({
      action: "update_db_row",
      details: "archive_entries · id=525 · Felder: metadata",
      revertedByAuditId: undo.id,
    });
    expect(entries.find((entry) => entry.id === undo.id)?.action).toBe(
      "undo_db_row",
    );
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
    const target = await insertUser({
      name: "Doomed Dana",
      email: "dana@example.test",
    });

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

  it("loads older audit rows from a stable timestamp-and-id cursor", async () => {
    const admin = await insertUser({ role: "admin" });
    await logAdminAction(admin.id, "create_user", null, "first");
    await logAdminAction(admin.id, "reset_password", null, "second");
    await logAdminAction(admin.id, "force_logout", null, "third");

    const recent = await listRecentAdminActions(2);
    const older = await listRecentAdminActions(2, {
      createdAt: recent[1].createdAt,
      id: recent[1].id,
    });

    expect(recent.map((entry) => entry.details)).toEqual(["third", "second"]);
    expect(older.map((entry) => entry.details)).toEqual(["first"]);
  });
});
