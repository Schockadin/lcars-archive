import { describe, it, expect } from "vitest";
import { canPlayNpcs, canView } from "./visibility";
import type { Viewer } from "./visibility";

function viewer(permissions: Viewer["permissions"]): Viewer {
  return { userId: 1, role: "player", permissions };
}

// NPCs (Datenbank-Einträge der Kategorie "npc") hängen an zwei Regeln: wer
// sie im Gespräch SPRICHT (canPlayNpcs) und wer sie überhaupt SIEHT (canView;
// ein NPC gehört meist niemandem, ownerId also null).
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
  it("zeigt veröffentlichte NPCs allen, auch ohne Login", () => {
    expect(canView(false, null, null)).toBe(true);
  });

  it("hält einen NPC-Entwurf von Spieler:innen fern", () => {
    const player = viewer(["content.create"]);
    expect(canView(true, null, player)).toBe(false);
    expect(canView(true, null, null)).toBe(false);
  });

  it("zeigt einen Entwurf seiner Owner-Person und der Administration", () => {
    // Ein NPC gehört in der Regel niemandem (ownerId null) — dann sieht ihn
    // als Entwurf ausschließlich, wer alles sehen darf.
    expect(canView(true, 1, viewer(["content.create"]))).toBe(true);
    expect(canView(true, 2, viewer(["content.create"]))).toBe(false);
    expect(canView(true, null, viewer(["content.view_all"]))).toBe(true);
  });
});
