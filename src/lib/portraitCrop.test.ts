import { describe, expect, it } from "vitest";
import {
  DEFAULT_CROP,
  MAX_ZOOM,
  isDefaultCrop,
  parsePortraitCrop,
  pdfCropBox,
  previewStyle,
  resolvePortraitView,
} from "./portraitCrop";

// Der Ausschnitt ist eine Anweisung auf dem Original (siehe portraitCrop.ts):
// Bildschirm und PDF müssen daraus dieselbe Darstellung bauen, und ein
// kaputter Wert aus der Metadata darf keinen Bogen zerlegen.

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

describe("previewStyle", () => {
  it("verankert Position und Zoom-Ursprung am selben Punkt", () => {
    // Sonst liefe das Bild beim Zoomen unter dem Finger weg.
    const style = previewStyle({ zoom: 2, x: 30, y: 70 });
    expect(style.objectPosition).toBe("30% 70%");
    expect(style.transformOrigin).toBe("30% 70%");
    expect(style.transform).toBe("scale(2)");
  });
});

describe("pdfCropBox", () => {
  const BOX = { width: 100, height: 200 };

  it("lässt den unveränderten Ausschnitt den Kasten genau füllen", () => {
    const box = pdfCropBox(DEFAULT_CROP, BOX);
    expect(box.width).toBe(100);
    expect(box.height).toBe(200);
    expect(box.left).toBe(0);
    expect(box.top).toBe(0);
    expect(box.objectPositionX).toBe("50%");
    expect(box.objectPositionY).toBe("50%");
  });

  it("vergrößert um den Zoom und hält den gewählten Punkt fest", () => {
    // Dasselbe, was transform: scale() mit transform-origin am Punkt tut:
    // der Punkt bleibt an seiner Stelle, alles andere wächst um ihn herum.
    const box = pdfCropBox({ zoom: 2, x: 50, y: 50 }, BOX);
    expect(box.width).toBe(200);
    expect(box.height).toBe(400);
    expect(box.left).toBe(-50);
    expect(box.top).toBe(-100);
  });

  it("verschiebt bei einem Punkt am Rand entsprechend weniger", () => {
    const oben = pdfCropBox({ zoom: 2, x: 50, y: 0 }, BOX);
    expect(oben.top).toBe(0);
    const unten = pdfCropBox({ zoom: 2, x: 50, y: 100 }, BOX);
    expect(unten.top).toBe(-200);
  });

  it("begrenzt unbrauchbare Werte wie die Bildschirm-Variante", () => {
    const box = pdfCropBox({ zoom: 99, x: -10, y: 150 }, BOX);
    expect(box.width).toBe(BOX.width * MAX_ZOOM);
    expect(box.objectPositionX).toBe("0%");
    expect(box.objectPositionY).toBe("100%");
  });
});

describe("resolvePortraitView", () => {
  it("nimmt neue Datensätze so, wie sie sind (Portrait = Original)", () => {
    const view = resolvePortraitView("/bild.jpg", null, { zoom: 2, x: 10, y: 20 });
    expect(view.src).toBe("/bild.jpg");
    expect(view.crop).toEqual({ zoom: 2, x: 10, y: 20 });
  });

  it("nimmt im Altbestand das Original, auf das der Ausschnitt passt", () => {
    // Dort steht in portrait das eingebackene Bild — darauf ein zweites Mal
    // zuzuschneiden würde den Ausschnitt doppelt anwenden.
    const view = resolvePortraitView("/eingebacken.jpg", "/original.jpg", {
      zoom: 1.5,
      x: 40,
      y: 30,
    });
    expect(view.src).toBe("/original.jpg");
    expect(view.crop.zoom).toBe(1.5);
  });

  it("kommt ohne jedes Bild klar", () => {
    const view = resolvePortraitView(null, null, null);
    expect(view.src).toBeNull();
    expect(view.crop).toEqual(DEFAULT_CROP);
  });
});
