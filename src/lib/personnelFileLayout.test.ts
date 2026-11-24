import { describe, expect, it } from "vitest";
import { HEAD_BOXES, HEAD_REDESIGN_BACKGROUND, HEAD_REDESIGN_FIELDS } from "./personnelFileLayout";

describe("Felder der ersten Bogenseite", () => {
  it("liegen vollständig im überdeckten Bereich und überschneiden sich nicht", () => {
    const boxes = HEAD_REDESIGN_FIELDS.map(({ key }) => HEAD_BOXES[key]);
    for (const [index, a] of boxes.entries()) {
      expect(a.left).toBeGreaterThanOrEqual(HEAD_REDESIGN_BACKGROUND.left);
      expect(a.top).toBeGreaterThanOrEqual(HEAD_REDESIGN_BACKGROUND.top);
      expect(a.left + a.width).toBeLessThanOrEqual(HEAD_REDESIGN_BACKGROUND.left + HEAD_REDESIGN_BACKGROUND.width);
      expect(a.top + a.height).toBeLessThanOrEqual(HEAD_REDESIGN_BACKGROUND.top + HEAD_REDESIGN_BACKGROUND.height);
      for (const b of boxes.slice(index + 1)) {
        expect(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top).toBe(true);
      }
    }
  });
});
