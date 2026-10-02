import { describe, expect, it } from "vitest";
import {
  isEditorDraftType,
  validateEditorDraftFields,
} from "./editorDraftTypes";

describe("editor draft data", () => {
  it("accepts only supported content types", () => {
    expect(isEditorDraftType("archive")).toBe(true);
    expect(isEditorDraftType("mission")).toBe(true);
    expect(isEditorDraftType("mission_log")).toBe(true);
    expect(isEditorDraftType("manual_event")).toBe(true);
    expect(isEditorDraftType("character_document")).toBe(true);
    expect(isEditorDraftType("dialogue")).toBe(true);
    expect(isEditorDraftType("game_session")).toBe(true);
    expect(isEditorDraftType("planned_session")).toBe(true);
    expect(isEditorDraftType("character")).toBe(false);
    expect(isEditorDraftType(null)).toBe(false);
  });

  it("keeps supported form values and rejects unsafe shapes", () => {
    expect(
      validateEditorDraftFields({
        title: "Eintrag",
        isDraft: true,
        tags: ["alpha", "beta"],
      }),
    ).toEqual({
      title: "Eintrag",
      isDraft: true,
      tags: ["alpha", "beta"],
    });
    expect(validateEditorDraftFields(null)).toBeNull();
    expect(validateEditorDraftFields({ "bad key": "value" })).toBeNull();
    expect(validateEditorDraftFields({ files: [new File([], "secret.txt")] })).toBeNull();
  });

  it("rejects drafts that exceed the request size limit", () => {
    expect(validateEditorDraftFields({ bodyMarkdown: "x".repeat(510_000) })).toBeNull();
  });
});
