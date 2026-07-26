import { describe, it, expect } from "vitest";
import {
  resolvePermissions,
  rolePermissions,
  hasPermission,
  userCan,
  setActiveRolePresets,
  getActiveRolePresets,
  roleLabel,
  isSystemRole,
  DEFAULT_ROLE_PRESETS,
  ROLE_PRESETS,
  type Role,
  type RoleMap,
} from "./permissions";

describe("rolePermissions / ROLE_PRESETS", () => {
  it("löst jedes Einzel-Preset exakt auf", () => {
    for (const role of Object.keys(ROLE_PRESETS) as Role[]) {
      const perms = rolePermissions([role]);
      expect([...perms].sort()).toEqual([...ROLE_PRESETS[role]].sort());
    }
  });

  it("Presets sind minimal überlappend: nur content.follow/users.browse geteilt", () => {
    // guest hat nur content.follow; viewer fügt users.browse hinzu.
    expect([...rolePermissions(["guest"])]).toEqual(["content.follow"]);
    expect(rolePermissions(["viewer"]).has("users.browse")).toBe(true);
    // Spezial-Rechte tauchen jeweils nur in EINER Rolle auf.
    expect(rolePermissions(["admin"]).has("gm.access")).toBe(false);
    expect(rolePermissions(["admin"]).has("content.create")).toBe(false);
    expect(rolePermissions(["gm"]).has("content.create")).toBe(false);
    expect(rolePermissions(["gm"]).has("users.manage")).toBe(false);
  });
});

describe("resolvePermissions — mehrere Rollen (Vereinigung)", () => {
  it("vereinigt die Presets mehrerer Rollen", () => {
    const perms = resolvePermissions(["admin", "gm", "player"], {});
    // admin-, gm- und player-Spezialrechte zugleich vorhanden.
    expect(perms.has("users.manage")).toBe(true); // admin
    expect(perms.has("campaign.manage")).toBe(true); // gm
    expect(perms.has("content.create")).toBe(true); // player
    expect(perms.has("content.view_all")).toBe(true); // admin
  });

  it("[viewer, player] = Union beider Presets", () => {
    const perms = resolvePermissions(["viewer", "player"], {});
    expect(perms.has("users.browse")).toBe(true);
    expect(perms.has("content.create")).toBe(true);
    expect(perms.has("gm.access")).toBe(false);
  });

  it("dedupliziert doppelte Rollen ohne Fehler", () => {
    expect([...resolvePermissions(["player", "player"], {})].sort()).toEqual(
      [...rolePermissions(["player"])].sort(),
    );
  });
});

describe("resolvePermissions — Overrides", () => {
  it("gewährt ein zusätzliches Recht (grant)", () => {
    const perms = resolvePermissions(["player"], { "gm.access": true });
    expect(perms.has("gm.access")).toBe(true);
  });

  it("entzieht ein von der Rolle geerbtes Recht (deny)", () => {
    const base = resolvePermissions(["gm"], {});
    expect(base.has("campaign.manage")).toBe(true);
    const denied = resolvePermissions(["gm"], { "campaign.manage": false });
    expect(denied.has("campaign.manage")).toBe(false);
  });

  it("ignoriert unbekannte Rollen und unbekannte Override-Keys", () => {
    const perms = resolvePermissions(["player", "does-not-exist" as Role], {
      "not.a.permission": true,
    } as Record<string, boolean>);
    expect(perms.has("content.create")).toBe(true);
    expect(perms.has("not.a.permission" as never)).toBe(false);
  });
});

describe("hasPermission", () => {
  it("prüft ein Recht im Set", () => {
    const perms = resolvePermissions(["admin"], {});
    expect(hasPermission(perms, "admin.access")).toBe(true);
    expect(hasPermission(perms, "gm.access")).toBe(false);
  });
});

describe("DB-gestützte Rollen (RoleMap-Parameter)", () => {
  it("löst eigene Rollen über eine explizite roleMap auf", () => {
    const roleMap: RoleMap = {
      ...DEFAULT_ROLE_PRESETS,
      chronist: ["content.follow", "content.create", "content.autolink_tools"],
    };
    const perms = rolePermissions(["chronist"], roleMap);
    expect(perms.has("content.create")).toBe(true);
    expect(perms.has("content.autolink_tools")).toBe(true);
    expect(perms.has("admin.access")).toBe(false);
  });

  it("eine bearbeitete System-Rolle in der roleMap ersetzt den Default", () => {
    const roleMap: RoleMap = {
      ...DEFAULT_ROLE_PRESETS,
      // gm ohne campaign.manage (Recht gezielt entzogen)
      gm: DEFAULT_ROLE_PRESETS.gm.filter((p) => p !== "campaign.manage"),
    };
    expect(rolePermissions(["gm"], roleMap).has("campaign.manage")).toBe(false);
    // Default-Map (ohne Parameter) bleibt unberührt.
    expect(rolePermissions(["gm"]).has("campaign.manage")).toBe(true);
  });

  it("userCan berücksichtigt Union aus eigener + System-Rolle", () => {
    const roleMap: RoleMap = {
      ...DEFAULT_ROLE_PRESETS,
      chronist: ["content.autolink_tools"],
    };
    const user = {
      role: "player",
      additional_roles: ["chronist"],
      permission_overrides: {},
    };
    expect(userCan(user, "content.create", roleMap)).toBe(true); // player
    expect(userCan(user, "content.autolink_tools", roleMap)).toBe(true); // chronist
    expect(userCan(user, "admin.access", roleMap)).toBe(false);
  });
});

describe("aktive Rollen-Map (Registry)", () => {
  it("setActiveRolePresets wirkt auf Aufrufe ohne expliziten roleMap-Parameter", () => {
    const before = getActiveRolePresets();
    try {
      setActiveRolePresets({
        ...DEFAULT_ROLE_PRESETS,
        gm: [...DEFAULT_ROLE_PRESETS.gm, "content.create"],
        wächter: ["content.follow", "content.moderate"],
      });
      // Ohne Parameter zieht jetzt die aktive Map.
      expect(rolePermissions(["gm"]).has("content.create")).toBe(true);
      expect(rolePermissions(["wächter"]).has("content.moderate")).toBe(true);
    } finally {
      // Registry für die übrigen Tests zurücksetzen.
      setActiveRolePresets(before);
    }
    expect(rolePermissions(["gm"]).has("content.create")).toBe(false);
  });
});

describe("roleLabel / isSystemRole", () => {
  it("bevorzugt DB-Labels, fällt auf System-Labels und dann den Schlüssel zurück", () => {
    expect(roleLabel("admin")).toBe("Administration");
    expect(roleLabel("chronist")).toBe("chronist");
    expect(roleLabel("chronist", { chronist: "Chronist" })).toBe("Chronist");
    // DB-Label gewinnt auch über ein System-Label.
    expect(roleLabel("gm", { gm: "Leitung" })).toBe("Leitung");
  });

  it("erkennt System-Rollen", () => {
    expect(isSystemRole("admin")).toBe(true);
    expect(isSystemRole("chronist")).toBe(false);
  });

  it("ROLE_PRESETS ist der Alias auf DEFAULT_ROLE_PRESETS", () => {
    expect(ROLE_PRESETS).toBe(DEFAULT_ROLE_PRESETS);
  });
});
