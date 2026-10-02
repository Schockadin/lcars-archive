import { describe, expect, it } from "vitest";
import sql from "@/lib/db";
import {
  readEditorDraft,
  removeEditorDraft,
  saveEditorDraft,
} from "@/lib/editorDrafts";
import { insertNpcEntry, insertUser } from "./helpers";

describe("editor drafts", () => {
  it("saves a private form snapshot and rejects stale tab revisions", async () => {
    const user = await insertUser();
    const entry = await insertNpcEntry();
    const first = await saveEditorDraft(user.id, "archive", entry.id, null, {
      title: "Local title",
      bodyMarkdown: "Local body",
      isDraft: true,
    });

    expect(first).toEqual({ revision: 1 });
    expect(
      await readEditorDraft(user.id, "archive", entry.id),
    ).toEqual({
      revision: 1,
      fields: {
        title: "Local title",
        bodyMarkdown: "Local body",
        isDraft: true,
      },
    });
    expect(
      await saveEditorDraft(user.id, "archive", entry.id, null, {
        title: "stale tab",
      }),
    ).toBeNull();

    expect(
      await saveEditorDraft(user.id, "archive", entry.id, 1, {
        title: "Updated title",
      }),
    ).toEqual({ revision: 2 });
  });

  it("removes a draft after commit and discards expired rows when loaded", async () => {
    const user = await insertUser();
    const entry = await insertNpcEntry();
    await saveEditorDraft(user.id, "archive", entry.id, null, { title: "Draft" });

    await removeEditorDraft(user.id, "archive", entry.id);
    expect(await readEditorDraft(user.id, "archive", entry.id)).toBeNull();
    expect(
      await saveEditorDraft(user.id, "archive", entry.id, 1, { title: "Stale" }),
    ).toBeNull();

    await saveEditorDraft(user.id, "archive", entry.id, null, { title: "Old draft" });
    await sql`
      UPDATE editor_drafts SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE user_id = ${user.id} AND content_type = 'archive'
        AND content_id = ${entry.id}
    `;
    expect(await readEditorDraft(user.id, "archive", entry.id)).toBeNull();
    const rows = await sql`
      SELECT 1 FROM editor_drafts
      WHERE user_id = ${user.id} AND content_type = 'archive'
        AND content_id = ${entry.id}
    `;
    expect(rows).toHaveLength(0);
  });
});
