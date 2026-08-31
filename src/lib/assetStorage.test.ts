import { describe, it, expect } from "vitest";
import {
  buildAssetPublicUrl,
  assertImageAsset,
  assertCharacterSheetAsset,
  sanitizeFileName,
  InvalidAssetError,
  MAX_ASSET_IMAGE_BYTES,
  MAX_CHARACTER_SHEET_BYTES,
} from "./assetStorage";

describe("buildAssetPublicUrl", () => {
  it("fügt Basis-URL und Key mit genau einem Slash zusammen", () => {
    expect(
      buildAssetPublicUrl("https://assets.example.com", "content-images/a.jpg"),
    ).toBe("https://assets.example.com/content-images/a.jpg");
  });

  it("normalisiert einen Trailing-Slash der Basis und führende Slashes des Keys", () => {
    expect(
      buildAssetPublicUrl("https://assets.example.com/", "/content-images/a.jpg"),
    ).toBe("https://assets.example.com/content-images/a.jpg");
    expect(
      buildAssetPublicUrl("https://assets.example.com///", "a.jpg"),
    ).toBe("https://assets.example.com/a.jpg");
  });

  // Regressionsschutz für eine reale Fehlkonfiguration: stand in
  // R2_ASSET_PUBLIC_BASE_URL der Bucketname statt der Auslieferungs-Domain,
  // entstand daraus eine gültige, aber nirgends auflösbare URL, die still als
  // Portrait gespeichert wurde ("https://neo-archive-assets/…").
  it("verweigert einen Hostnamen ohne Punkt (Bucketname statt Domain)", () => {
    expect(() =>
      buildAssetPublicUrl("https://neo-archive-assets", "character-portraits/a.jpg"),
    ).toThrow(InvalidAssetError);
    expect(() =>
      buildAssetPublicUrl("https://neo-archive-assets", "a.jpg"),
    ).toThrow(/Bucketnamen/);
  });

  it("verweigert Werte, die gar keine http(s)-URL sind", () => {
    for (const base of ["", "neo-archive-assets", "ftp://assets.example.com"]) {
      expect(() => buildAssetPublicUrl(base, "a.jpg")).toThrow(InvalidAssetError);
    }
  });

  it("lässt localhost für die lokale Entwicklung zu", () => {
    expect(buildAssetPublicUrl("http://localhost:9000", "a.jpg")).toBe(
      "http://localhost:9000/a.jpg",
    );
  });
});

describe("assertImageAsset", () => {
  it("liefert die Endung für erlaubte Bildtypen", () => {
    expect(assertImageAsset("image/jpeg", 1000)).toBe("jpg");
    expect(assertImageAsset("image/png", 1000)).toBe("png");
    expect(assertImageAsset("image/webp", 1000)).toBe("webp");
    expect(assertImageAsset("image/gif", 1000)).toBe("gif");
  });

  it("verweigert unbekannte Typen, leere und zu große Dateien", () => {
    expect(() => assertImageAsset("application/pdf", 1000)).toThrow(
      InvalidAssetError,
    );
    expect(() => assertImageAsset("image/png", 0)).toThrow(InvalidAssetError);
    expect(() => assertImageAsset("image/png", MAX_ASSET_IMAGE_BYTES + 1)).toThrow(
      InvalidAssetError,
    );
  });
});

describe("assertCharacterSheetAsset", () => {
  it("akzeptiert ein PDF innerhalb des Limits", () => {
    expect(() => assertCharacterSheetAsset("application/pdf", 1000)).not.toThrow();
  });

  it("verweigert Nicht-PDF, leere und zu große Dateien", () => {
    expect(() => assertCharacterSheetAsset("image/png", 1000)).toThrow(
      InvalidAssetError,
    );
    expect(() => assertCharacterSheetAsset("application/pdf", 0)).toThrow(
      InvalidAssetError,
    );
    expect(() =>
      assertCharacterSheetAsset("application/pdf", MAX_CHARACTER_SHEET_BYTES + 1),
    ).toThrow(InvalidAssetError);
  });
});

describe("sanitizeFileName", () => {
  it("entfernt Pfadanteile und behält den reinen Dateinamen (inkl. Leerzeichen)", () => {
    expect(sanitizeFileName("/etc/../Bogen 2.pdf")).toBe("Bogen 2.pdf");
    expect(sanitizeFileName("C:\\Users\\x\\Sheet-v2.pdf")).toBe("Sheet-v2.pdf");
  });

  it("entfernt Steuerzeichen, behält aber sichtbare Zeichen", () => {
    expect(sanitizeFileName("a\nb\tc.pdf")).toBe("abc.pdf");
  });

  it("fällt bei leerem Ergebnis auf den Fallback zurück", () => {
    expect(sanitizeFileName("")).toBe("datei.pdf");
    expect(sanitizeFileName("///")).toBe("datei.pdf");
  });
});
