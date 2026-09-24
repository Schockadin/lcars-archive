import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import {
  CHARACTER_DOCUMENT_KINDS,
  MAX_CHARACTER_DOCUMENT_BYTES,
  type CharacterDocumentKind,
} from "@/lib/characterDocumentTypes";

const MIME_BY_KIND: Record<CharacterDocumentKind, string> = {
  pdf: "application/pdf",
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

export class InvalidCharacterDocumentError extends Error {}

function extensionOf(fileName: string): CharacterDocumentKind | null {
  const match = /\.([^.]+)$/.exec(fileName.trim().toLowerCase());
  const extension = match?.[1] ?? "";
  return (CHARACTER_DOCUMENT_KINDS as readonly string[]).includes(extension)
    ? (extension as CharacterDocumentKind)
    : null;
}

function decodeUtf8(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(buffer)
      .replace(/^\uFEFF/, "");
  } catch {
    throw new InvalidCharacterDocumentError(
      "Die Textdatei ist nicht gültig UTF-8-kodiert.",
    );
  }
}

export async function inspectCharacterDocument(
  fileName: string,
  buffer: Buffer,
): Promise<{
  kind: CharacterDocumentKind;
  contentMime: string;
  extractedText: string | null;
}> {
  const kind = extensionOf(fileName);
  if (!kind) {
    throw new InvalidCharacterDocumentError(
      "Erlaubt sind PDF-, Markdown-, DOCX- und TXT-Dateien.",
    );
  }
  if (buffer.byteLength === 0) {
    throw new InvalidCharacterDocumentError("Die Datei ist leer.");
  }
  if (buffer.byteLength > MAX_CHARACTER_DOCUMENT_BYTES) {
    throw new InvalidCharacterDocumentError(
      "Die Datei ist zu groß (max. 8 MB).",
    );
  }

  if (kind === "pdf") {
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new InvalidCharacterDocumentError(
        "Die Datei ist kein gültiges PDF.",
      );
    }
    let pdf: PDFDocument;
    try {
      // Unter jsdom/Node 24 stammt Buffer aus einem anderen Uint8Array-Realm
      // als die von pdf-lib geprüfte globale Klasse. Eine echte Kopie ist in
      // beiden Umgebungen stabil und verhindert, dass gültige PDFs allein an
      // diesem instanceof-Unterschied scheitern.
      pdf = await PDFDocument.load(new Uint8Array(buffer));
    } catch {
      throw new InvalidCharacterDocumentError(
        "Das PDF ist beschädigt oder geschützt und kann nicht verarbeitet werden.",
      );
    }
    if (pdf.getPageCount() === 0) {
      throw new InvalidCharacterDocumentError("Das PDF enthält keine Seite.");
    }
    return { kind, contentMime: MIME_BY_KIND[kind], extractedText: null };
  }

  if (kind === "docx") {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new InvalidCharacterDocumentError(
        "Die Datei ist kein gültiges DOCX.",
      );
    }
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        kind,
        contentMime: MIME_BY_KIND[kind],
        extractedText: result.value.trim(),
      };
    } catch {
      throw new InvalidCharacterDocumentError(
        "Das DOCX konnte nicht gelesen werden.",
      );
    }
  }

  return {
    kind,
    contentMime: MIME_BY_KIND[kind],
    extractedText: decodeUtf8(buffer),
  };
}
