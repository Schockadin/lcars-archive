import { describe, expect, it } from "vitest";
import {
  needsPortraitImport,
  parseImageDataUrl,
  portraitKind,
} from "./portraitSource";

// Die Einteilung entscheidet, was der Wartungslauf anfasst. Ein Fehler nach
// der einen Seite lässt eine fremde Adresse stehen, einer nach der anderen
// lädt ein Bild, das längst im eigenen Bucket liegt, ein zweites Mal hoch.

const BASE = "https://assets.example.org";

describe("portraitKind", () => {
  it("erkennt einen eigenen Upload an Basis UND Präfix", () => {
    expect(portraitKind(`${BASE}/character-portraits/abc.jpg`, BASE)).toBe(
      "upload",
    );
    // Dieselbe Basis, aber ein anderer Ordner: kein Portrait-Upload.
    expect(portraitKind(`${BASE}/content-images/abc.jpg`, BASE)).toBe(
      "external",
    );
  });

  it("verträgt einen Schrägstrich am Ende der Basis", () => {
    expect(portraitKind(`${BASE}/character-portraits/a.jpg`, `${BASE}/`)).toBe(
      "upload",
    );
  });

  it("unterscheidet leer, Data-URL, eigenen Pfad und fremde Adresse", () => {
    expect(portraitKind(null, BASE)).toBe("empty");
    expect(portraitKind("   ", BASE)).toBe("empty");
    expect(portraitKind("data:image/png;base64,AAAA", BASE)).toBe("data");
    expect(portraitKind("/api/content-images/12", BASE)).toBe("internal");
    expect(portraitKind("https://fremd.example/x.png", BASE)).toBe("external");
  });

  it("hält ohne konfigurierte Basis jede Adresse für fremd", () => {
    // Sicherer Ausgang: lieber einmal zu viel prüfen als einen fremden Link
    // stehen lassen. Der Wartungslauf bricht ohne Basis ohnehin vorher ab.
    expect(portraitKind(`${BASE}/character-portraits/a.jpg`, null)).toBe(
      "external",
    );
  });
});

describe("needsPortraitImport", () => {
  it("fasst genau die beiden abzulösenden Fälle zusammen", () => {
    expect(needsPortraitImport("data:image/png;base64,AAAA", BASE)).toBe(true);
    expect(needsPortraitImport("https://fremd.example/x.png", BASE)).toBe(true);
    expect(needsPortraitImport(`${BASE}/character-portraits/a.jpg`, BASE)).toBe(
      false,
    );
    expect(needsPortraitImport("/api/content-images/12", BASE)).toBe(false);
    expect(needsPortraitImport(null, BASE)).toBe(false);
  });
});

describe("parseImageDataUrl", () => {
  it("zerlegt eine Bild-Data-URL", () => {
    expect(parseImageDataUrl("data:image/PNG;base64,QUJD")).toEqual({
      mimeType: "image/png",
      base64: "QUJD",
    });
  });

  it("weist alles ab, was kein Bild ist", () => {
    for (const value of [
      "keine data-url",
      "data:text/plain;base64,QQ==",
      "data:image/png,nicht-base64-markiert",
      "data:image/png;base64,",
    ]) {
      expect(parseImageDataUrl(value)).toBeNull();
    }
  });
});
