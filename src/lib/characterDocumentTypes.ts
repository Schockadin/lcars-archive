export const CHARACTER_DOCUMENT_KINDS = ["pdf", "md", "docx", "txt"] as const;
export type CharacterDocumentKind = (typeof CHARACTER_DOCUMENT_KINDS)[number];

export const CHARACTER_DOCUMENT_ACCEPT = ".pdf,.md,.docx,.txt";
export const MAX_CHARACTER_DOCUMENT_BYTES = 8 * 1024 * 1024;

export interface CharacterDocument {
  id: number;
  characterId: number;
  fileName: string;
  kind: CharacterDocumentKind;
  sizeBytes: number;
  createdAt: string;
  previewUrl: string;
  downloadUrl: string;
}
