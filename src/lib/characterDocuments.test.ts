import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  InvalidCharacterDocumentError,
  inspectCharacterDocument,
  normalizeCharacterDocumentFileName,
} from "./characterDocumentValidation";

describe("inspectCharacterDocument", () => {
  it("liest UTF-8-Markdown und entfernt einen BOM", async () => {
    await expect(
      inspectCharacterDocument(
        "Notizen.MD",
        Buffer.from("\uFEFF# Sternenflotte", "utf8"),
      ),
    ).resolves.toEqual({
      kind: "md",
      contentMime: "text/markdown",
      extractedText: "# Sternenflotte",
    });
  });

  it("akzeptiert ein tatsächlich lesbares PDF", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();

    const inspected = await inspectCharacterDocument(
      "akte.pdf",
      Buffer.from(await pdf.save()),
    );

    expect(inspected).toEqual({
      kind: "pdf",
      contentMime: "application/pdf",
      extractedText: null,
    });
  });

  it("weist ein formal gültiges PDF ohne Seiten zurück", async () => {
    const pdf = await PDFDocument.create();

    await expect(
      inspectCharacterDocument(
        "leer.pdf",
        Buffer.from(await pdf.save({ addDefaultPage: false })),
      ),
    ).rejects.toThrow(/keine Seite/);
  });

  it("weist eine umbenannte Nicht-PDF-Datei zurück", async () => {
    await expect(
      inspectCharacterDocument("akte.pdf", Buffer.from("kein pdf")),
    ).rejects.toBeInstanceOf(InvalidCharacterDocumentError);
  });

  it("weist unbekannte Formate und ungültiges UTF-8 zurück", async () => {
    await expect(
      inspectCharacterDocument("akte.exe", Buffer.from("x")),
    ).rejects.toThrow(/Erlaubt/);
    await expect(
      inspectCharacterDocument("akte.txt", Buffer.from([0xc3, 0x28])),
    ).rejects.toThrow(/UTF-8/);
  });
});

describe("normalizeCharacterDocumentFileName", () => {
  it("entfernt Pfadanteile und erhält die vorhandene Dateiendung", () => {
    expect(
      normalizeCharacterDocumentFileName(
        "  C:\\fakepath\\Neue Akte.PDF  ",
        "pdf",
      ),
    ).toBe("Neue Akte.PDF");
  });

  it("weist leere Namen und geänderte Dateiendungen zurück", () => {
    expect(() => normalizeCharacterDocumentFileName("   ", "pdf")).toThrow(
      /Dateinamen/,
    );
    expect(() =>
      normalizeCharacterDocumentFileName("Dienstakte.txt", "pdf"),
    ).toThrow(/\.pdf/);
  });
});
