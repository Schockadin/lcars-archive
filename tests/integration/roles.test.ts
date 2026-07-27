import { describe, it, expect, beforeEach, vi } from "vitest";

// roles.ts nutzt next/cache (unstable_cache für den Lese-Hotpath, revalidateTag
// bei Mutationen). Außerhalb eines Next-Requests wirft revalidateTag; hier wird
// next/cache daher gestubbt: unstable_cache reicht die Funktion durch (uncacht),
// revalidateTag ist ein No-op. (Die getesteten Funktionen selbst nutzen ohnehin
// buildRoleMap/ensureSystemRoles ohne React-cache.)
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: () => {},
}));

import sql from "@/lib/db";
import {
  ensureSystemRoles,
  buildRoleMap,
  listRolesForAdmin,
  getRoleByKey,
  createRole,
  updateRole,
  deleteRole,
  RoleKeyTakenError,
  RoleInUseError,
  SystemRoleError,
} from "@/lib/roles";
import { insertUser } from "./helpers";

// resetDb() (setup.ts) truncatet die roles-Tabelle NICHT — daher hier je Test
// zusätzlich leeren, damit Rollen zwischen Tests nicht durchsickern.
beforeEach(async () => {
  await sql`DELETE FROM roles`;
});

describe("ensureSystemRoles + buildRoleMap", () => {
  it("legt die fünf System-Rollen mit ihren Default-Rechten an", async () => {
    await ensureSystemRoles();

    const map = await buildRoleMap();
    // admin: Verwaltung/Moderation
    expect(map.admin).toContain("admin.access");
    expect(map.admin).toContain("dialogues.moderate");
    // gm: Spielleitungs-Werkzeuge, KEIN content.create
    expect(map.gm).toContain("gm.access");
    expect(map.gm).not.toContain("content.create");
    // player: Inhalte anlegen
    expect(map.player).toContain("content.create");

    const adminRow = await getRoleByKey("admin");
    expect(adminRow?.is_system).toBe(true);
  });

  it("ist idempotent und überschreibt bearbeitete Rechte nicht", async () => {
    await ensureSystemRoles();
    // admin-Rechte reduzieren (bearbeitete System-Rolle)
    await updateRole("admin", {
      label: "Administration",
      description: "",
      permissions: ["admin.access"],
    });
    // erneuter Seed darf die Bearbeitung nicht zurücksetzen (ON CONFLICT DO NOTHING)
    await ensureSystemRoles();

    const map = await buildRoleMap();
    expect(map.admin).toEqual(["admin.access"]);
    expect(map.admin).not.toContain("dialogues.moderate");
  });

  it("filtert unbekannte Rechte-Schlüssel aus der DB heraus", async () => {
    await sql`
      INSERT INTO roles (key, label, permissions, is_system, sort_order)
      VALUES ('kaputt', 'Kaputt', '{content.create,nicht.echt}', FALSE, 200)
    `;
    const map = await buildRoleMap();
    expect(map.kaputt).toContain("content.create");
    expect(map.kaputt).not.toContain("nicht.echt");
  });
});

describe("createRole / updateRole", () => {
  it("legt eine eigene Rolle an und nimmt sie in die Map auf", async () => {
    await createRole({
      key: "chronist",
      label: "Chronist",
      description: "Schreibt Chroniken.",
      permissions: ["content.create", "content.autolink_tools"],
    });

    const map = await buildRoleMap();
    expect(map.chronist).toEqual([
      "content.create",
      "content.autolink_tools",
    ]);
    const row = await getRoleByKey("chronist");
    expect(row?.is_system).toBe(false);
  });

  it("wirft RoleKeyTakenError bei doppeltem Schlüssel", async () => {
    await createRole({ key: "dup", label: "A", description: "", permissions: [] });
    await expect(
      createRole({ key: "dup", label: "B", description: "", permissions: [] }),
    ).rejects.toBeInstanceOf(RoleKeyTakenError);
  });

  it("aktualisiert Label/Beschreibung/Rechte einer bestehenden Rolle", async () => {
    await createRole({
      key: "wächter",
      label: "Wächter",
      description: "",
      permissions: ["content.follow"],
    });
    await updateRole("wächter", {
      label: "Wächter (neu)",
      description: "geändert",
      permissions: ["content.follow", "content.moderate"],
    });

    const row = await getRoleByKey("wächter");
    expect(row?.label).toBe("Wächter (neu)");
    expect(row?.description).toBe("geändert");
    expect((await buildRoleMap()).wächter).toContain("content.moderate");
  });
});

describe("deleteRole", () => {
  it("verweigert das Löschen einer System-Rolle", async () => {
    await ensureSystemRoles();
    await expect(deleteRole("admin")).rejects.toBeInstanceOf(SystemRoleError);
  });

  it("verweigert das Löschen einer noch zugewiesenen Rolle", async () => {
    await createRole({
      key: "zugewiesen",
      label: "Zugewiesen",
      description: "",
      permissions: [],
    });
    const user = await insertUser();
    // Zuweisung über additional_roles (umgeht den früheren role-CHECK).
    await sql`UPDATE users SET additional_roles = ARRAY['zugewiesen'] WHERE id = ${user.id}`;

    await expect(deleteRole("zugewiesen")).rejects.toBeInstanceOf(RoleInUseError);
  });

  it("löscht eine nicht zugewiesene eigene Rolle", async () => {
    await createRole({
      key: "frei",
      label: "Frei",
      description: "",
      permissions: [],
    });
    await deleteRole("frei");
    expect(await getRoleByKey("frei")).toBeNull();
  });
});

describe("listRolesForAdmin", () => {
  it("heilt fehlende System-Rollen und listet System vor eigenen", async () => {
    await createRole({
      key: "eigen",
      label: "Eigen",
      description: "",
      permissions: [],
    });
    const roles = await listRolesForAdmin();
    const keys = roles.map((r) => r.key);
    // System-Rollen vorhanden (per ensureSystemRoles nachgezogen) …
    for (const k of ["admin", "gm", "player", "viewer", "guest"]) {
      expect(keys).toContain(k);
    }
    // … und System-Rollen kommen vor eigenen (ORDER BY is_system DESC).
    expect(roles.find((r) => r.key === "eigen")?.is_system).toBe(false);
    expect(keys.indexOf("admin")).toBeLessThan(keys.indexOf("eigen"));
  });
});
