import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderCharacterArchiveTextPdf } from "./CharacterArchiveTextPdfDocument";

describe("renderCharacterArchiveTextPdf", () => {
  it("erzeugt ein lesbares Aktenblatt für ein angehängtes Textdokument", async () => {
    const buffer = await renderCharacterArchiveTextPdf({
      title: "Missionsnotizen.md",
      kind: "md",
      text: "# Beobachtungen\n\n- Erstkontakt hergestellt",
    });
    const pdf = await PDFDocument.load(new Uint8Array(buffer));

    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Missionsnotizen.md");
    expect(pdf.getAuthor()).toBe("Neo Archive");
  });
});
