import { describe, expect, it } from "vitest";
import {
  DEFAULT_CROP,
  MAX_ZOOM,
  PORTRAIT_ASPECT,
  cropRect,
  isDefaultCrop,
  parsePortraitCrop,
  previewStyle,
} from "./portraitCrop";

// Ein Ausschnitt, der über den Bildrand hinausragt, zeigt im Kasten einen
// Streifen Nichts — die Rechnung muss ihn deshalb immer im Bild halten. Und
// ein kaputter Wert aus der Metadata darf keinen Bogen zerlegen.

describe("parsePortraitCrop", () => {
  it("liest einen gepflegten Zuschnitt", () => {
    expect(parsePortraitCrop({ zoom: 1.5, x: 30, y: 70 })).toEqual({
      zoom: 1.5,
      x: 30,
      y: 70,
    });
  });

  it("fällt auf die Mitte zurück, wenn nichts Brauchbares dasteht", () => {
    for (const value of [null, undefined, "mitte", 42, {}]) {
      expect(parsePortraitCrop(value)).toEqual(DEFAULT_CROP);
    }
  });

  it("begrenzt Werte außerhalb des Erlaubten, statt sie zu übernehmen", () => {
    expect(parsePortraitCrop({ zoom: 99, x: -20, y: 500 })).toEqual({
      zoom: MAX_ZOOM,
      x: 0,
      y: 100,
    });
  });

  it("übergeht einzelne unbrauchbare Felder", () => {
    expect(parsePortraitCrop({ zoom: Number.NaN, x: 25, y: "hoch" })).toEqual({
      zoom: 1,
      x: 25,
      y: 50,
    });
  });
});

describe("isDefaultCrop", () => {
  it("erkennt den unveränderten Ausschnitt", () => {
    expect(isDefaultCrop(DEFAULT_CROP)).toBe(true);
    expect(isDefaultCrop({ zoom: 1, x: 40, y: 50 })).toBe(false);
  });
});

describe("cropRect", () => {
  it("nimmt bei einem zu breiten Bild die volle Höhe", () => {
    // 400 × 200, Kasten ist hochkant → die Höhe begrenzt.
    const rect = cropRect(400, 200, DEFAULT_CROP);
    expect(rect.sHeight).toBe(200);
    expect(rect.sWidth).toBeCloseTo(200 * PORTRAIT_ASPECT, 5);
    // Mittig: links und rechts bleibt gleich viel übrig.
    expect(rect.sx).toBeCloseTo((400 - rect.sWidth) / 2, 5);
    expect(rect.sy).toBe(0);
  });

  it("nimmt bei einem zu hohen Bild die volle Breite", () => {
    const rect = cropRect(200, 400, DEFAULT_CROP);
    expect(rect.sWidth).toBe(200);
    expect(rect.sHeight).toBeCloseTo(200 / PORTRAIT_ASPECT, 5);
    expect(rect.sy).toBeCloseTo((400 - rect.sHeight) / 2, 5);
  });

  it("behält immer das Seitenverhältnis des Kastens", () => {
    for (const [w, h, zoom] of [
      [400, 200, 1],
      [200, 400, 2],
      [1000, 1000, 1.7],
    ]) {
      const rect = cropRect(w, h, { ...DEFAULT_CROP, zoom });
      expect(rect.sWidth / rect.sHeight).toBeCloseTo(PORTRAIT_ASPECT, 5);
    }
  });

  it("verkleinert den Ausschnitt beim Zoomen", () => {
    const eins = cropRect(400, 400, DEFAULT_CROP);
    const zwei = cropRect(400, 400, { ...DEFAULT_CROP, zoom: 2 });
    expect(zwei.sWidth).toBeCloseTo(eins.sWidth / 2, 5);
    expect(zwei.sHeight).toBeCloseTo(eins.sHeight / 2, 5);
  });

  it("hält den Ausschnitt im Bild, auch am äußersten Rand", () => {
    for (const [x, y] of [
      [0, 0],
      [100, 100],
      [0, 100],
    ]) {
      const rect = cropRect(400, 400, { zoom: 2, x, y });
      expect(rect.sx).toBeGreaterThanOrEqual(0);
      expect(rect.sy).toBeGreaterThanOrEqual(0);
      expect(rect.sx + rect.sWidth).toBeLessThanOrEqual(400 + 1e-9);
      expect(rect.sy + rect.sHeight).toBeLessThanOrEqual(400 + 1e-9);
    }
  });

  it("verschiebt den Ausschnitt tatsächlich", () => {
    const oben = cropRect(400, 800, { zoom: 1, x: 50, y: 0 });
    const unten = cropRect(400, 800, { zoom: 1, x: 50, y: 100 });
    expect(oben.sy).toBe(0);
    expect(unten.sy).toBeGreaterThan(oben.sy);
  });

  it("liefert bei einem leeren Bild einen leeren Ausschnitt statt NaN", () => {
    expect(cropRect(0, 0, DEFAULT_CROP)).toEqual({
      sx: 0,
      sy: 0,
      sWidth: 0,
      sHeight: 0,
    });
  });
});

describe("previewStyle", () => {
  it("verankert Position und Zoom-Ursprung am selben Punkt", () => {
    // Sonst liefe das Bild beim Zoomen unter dem Finger weg.
    const style = previewStyle({ zoom: 2, x: 30, y: 70 });
    expect(style.objectPosition).toBe("30% 70%");
    expect(style.transformOrigin).toBe("30% 70%");
    expect(style.transform).toBe("scale(2)");
  });
});
