import { describe, it, expect } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  DOWNSCALE_THRESHOLD_BYTES,
  MAX_UPLOAD_EDGE,
  formatMegabytes,
  rejectionReason,
  replaceExtension,
  uploadErrorMessage,
} from "./imageUpload";
import { MAX_ASSET_IMAGE_BYTES } from "./assetStorage";

describe("Upload-Vorbereitung", () => {
  it("hält dieselbe Obergrenze wie der Server", () => {
    // Die Client-Grenze darf nie ÜBER der Server-Grenze liegen — sonst
    // schickt der Browser etwas los, das der Server ohnehin abweist.
    expect(MAX_UPLOAD_BYTES).toBe(MAX_ASSET_IMAGE_BYTES);
    // Verkleinert wird deutlich früher, damit eine Anfrage gar nicht erst in
    // die Nähe des Plattform-Limits kommt.
    expect(DOWNSCALE_THRESHOLD_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(MAX_UPLOAD_EDGE).toBeGreaterThan(1000);
  });

  it("weist an, was gar kein Bild ist", () => {
    expect(rejectionReason({ name: "a.jpg", size: 1000, type: "image/jpeg" })).toBeNull();
    expect(rejectionReason({ name: "leer.jpg", size: 0, type: "image/jpeg" })).toContain(
      "leer",
    );
    expect(
      rejectionReason({ name: "notiz.pdf", size: 1000, type: "application/pdf" }),
    ).toContain("kein Bild");
  });

  it("benennt die Datei beim Neucodieren um, ohne den Namen zu verlieren", () => {
    expect(replaceExtension("Portrait.PNG", "jpg")).toBe("Portrait.jpg");
    expect(replaceExtension("ohne-endung", "jpg")).toBe("ohne-endung.jpg");
    expect(replaceExtension("a.b.c.webp", "jpg")).toBe("a.b.c.jpg");
    expect(replaceExtension("", "jpg")).toBe("bild.jpg");
  });

  it("nennt bei zu großen Dateien die Größe, sonst einen brauchbaren Rat", () => {
    const zuGross = uploadErrorMessage({ name: "foto.jpg", size: 9 * 1024 * 1024 });
    expect(zuGross).toContain("9,0 MB");
    expect(zuGross).toContain("zu groß");

    const allgemein = uploadErrorMessage({ name: "foto.jpg", size: 1000 });
    expect(allgemein).toContain("foto.jpg");
    expect(allgemein).not.toContain("zu groß");
  });

  it("schreibt Größen deutsch mit Komma", () => {
    expect(formatMegabytes(5 * 1024 * 1024)).toBe("5,0 MB");
    expect(formatMegabytes(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});
