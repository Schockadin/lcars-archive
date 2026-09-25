import type { CharacterDocumentKind } from "@/lib/characterDocumentTypes";

export const CHARACTER_DOCUMENT_DISPLAY_NAME_LENGTH = 40;

// Kürzt nur die Anzeige, nie den gespeicherten Namen. Die Endung bleibt
// sichtbar, weil sie bei Dokumenten die schnellste Orientierung bietet.
export function characterDocumentDisplayName(
  fileName: string,
  maxLength = CHARACTER_DOCUMENT_DISPLAY_NAME_LENGTH,
): string {
  if (fileName.length <= maxLength) return fileName;
  if (maxLength < 2) return fileName.slice(0, Math.max(0, maxLength));

  const dot = fileName.lastIndexOf(".");
  const extension = dot > 0 ? fileName.slice(dot) : "";
  const stemLength = maxLength - extension.length - 1;
  if (stemLength < 4) return `${fileName.slice(0, maxLength - 1)}…`;
  return `${fileName.slice(0, stemLength)}…${extension}`;
}

export function characterDocumentKindLabel(
  kind: CharacterDocumentKind,
): string {
  if (kind === "docx") return "DOCX";
  if (kind === "md") return "Markdown";
  if (kind === "txt") return "Text";
  return "PDF";
}
