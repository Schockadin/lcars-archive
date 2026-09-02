import { describe, it, expect } from "vitest";
import { canPlayNpcs, canView } from "./visibility";
import type { Viewer } from "./visibility";

function viewer(permissions: Viewer["permissions"]): Viewer {
  return { userId: 1, role: "player", permissions };
}

// NPCs (Charaktere ohne Spieler) hängen an zwei Regeln: wer sie im Gespräch
// SPRICHT (canPlayNpcs) und wer sie überhaupt SIEHT (canView, mit ownerId
// null — ein NPC gehört niemandem).
describe("canPlayNpcs", () => {
  it("erlaubt es der Spielleitung und der Administration", () => {
    expect(canPlayNpcs(viewer(["gm.access"]))).toBe(true);
    expect(canPlayNpcs(viewer(["admin.access"]))).toBe(true);
  });

  it("verweigert es Spieler:innen und Anonymen", () => {
    expect(canPlayNpcs(viewer(["content.create", "content.follow"]))).toBe(
      false,
    );
    expect(canPlayNpcs(null)).toBe(false);
  });
});

describe("Sichtbarkeit von NPCs (canView ohne Owner)", () => {
  it("zeigt öffentliche NPCs allen, auch ohne Login", () => {
    expect(canView("public", null, null)).toBe(true);
  });

  it("hält intern gehaltene NPCs von Spieler:innen fern", () => {
    const player = viewer(["content.create"]);
    expect(canView("gm", null, player)).toBe(false);
    expect(canView("private", null, player)).toBe(false);
  });

  it("zeigt sie der Spielleitung (gm) bzw. der Administration (alle)", () => {
    expect(canView("gm", null, viewer(["content.view_gm"]))).toBe(true);
    expect(canView("private", null, viewer(["content.view_gm"]))).toBe(false);
    expect(canView("private", null, viewer(["content.view_all"]))).toBe(true);
  });
});
