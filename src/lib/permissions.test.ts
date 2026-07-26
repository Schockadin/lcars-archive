import { describe, it, expect } from "vitest";
import {
  resolvePermissions,
  rolePermissions,
  hasPermission,
  ROLE_PRESETS,
  type Role,
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
