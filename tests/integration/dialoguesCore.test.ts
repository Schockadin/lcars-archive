import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createDialogue,
  postDialogueMessage,
  editDialogueMessage,
  deleteDialogueMessage,
  setDialogueVisibility,
  deleteDialogue,
  DialogueClosedError,
  DialogueMessageForbiddenError,
} from "@/lib/dialoguesCore";
import { insertUser, insertCharacter } from "./helpers";

async function setupDialogue() {
  const ownUser = await insertUser();
  const partnerUser = await insertUser();
  const ownChar = await insertCharacter({ playerId: ownUser.id, name: "Own" });
  const partnerChar = await insertCharacter({
    playerId: partnerUser.id,
    name: "Partner",
  });

  const dialogue = await createDialogue({
    title: "Ein Gespräch",
    ownCharacterId: ownChar.id,
    partnerCharacterId: partnerChar.id,
    authorUserId: ownUser.id,
    setting: null,
    locationSlug: null,
    logDate: null,
    tags: [],
    bodyMarkdown: "Hallo!",
    subscribeSelf: true,
  });

  const [entry] = await sql<{ id: number }[]>`
    SELECT id FROM archive_entries WHERE slug = ${dialogue.slug}
  `;

  return { ownUser, partnerUser, ownChar, partnerChar, dialogue, entryId: entry.id };
}

describe("createDialogue", () => {
  it("creates an open dialogue entry with the first message and auto-subscribes both participants", async () => {
    const { ownUser, partnerUser, dialogue, entryId } = await setupDialogue();

    const [entry] = await sql<{ dialogue_open: boolean; owner_user_id: number }[]>`
      SELECT dialogue_open, owner_user_id FROM archive_entries WHERE id = ${entryId}
    `;
    expect(entry.dialogue_open).toBe(true);
    expect(entry.owner_user_id).toBe(ownUser.id);

    const messages = await sql`SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}`;
    expect(messages).toHaveLength(1);

    const follows = await sql<{ user_id: number }[]>`
      SELECT user_id FROM content_follows WHERE target_slug = ${dialogue.slug}
    `;
    const subscriberIds = follows.map((f) => f.user_id).sort();
    expect(subscriberIds).toEqual([ownUser.id, partnerUser.id].sort());
  });

  it("gives a second dialogue with the same title a distinct, de-duplicated slug", async () => {
    const { dialogue: first } = await setupDialogue();
    const ownUser = await insertUser();
    const partnerUser = await insertUser();
    const ownChar = await insertCharacter({ playerId: ownUser.id });
    const partnerChar = await insertCharacter({ playerId: partnerUser.id });

    const second = await createDialogue({
      title: "Ein Gespräch",
      ownCharacterId: ownChar.id,
      partnerCharacterId: partnerChar.id,
      authorUserId: ownUser.id,
      setting: null,
      locationSlug: null,
      logDate: null,
      tags: [],
      bodyMarkdown: "Hallo!",
      subscribeSelf: true,
    });

    expect(second.slug).not.toBe(first.slug);
  });
});

describe("postDialogueMessage", () => {
  it("appends a message to an open dialogue", async () => {
    const { ownChar, ownUser, entryId } = await setupDialogue();

    const message = await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: ownChar.id,
      authorUserId: ownUser.id,
      bodyMarkdown: "Zweite Nachricht",
    });

    expect(message.characterSlug).toBe(ownChar.slug);
    const rows = await sql`SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}`;
    expect(rows).toHaveLength(2);
  });

  it("refuses to post to a closed dialogue", async () => {
    const { ownChar, ownUser, entryId } = await setupDialogue();
    await sql`UPDATE archive_entries SET dialogue_open = FALSE WHERE id = ${entryId}`;

    await expect(
      postDialogueMessage({
        archiveEntryId: entryId,
        characterId: ownChar.id,
        authorUserId: ownUser.id,
        bodyMarkdown: "Zu spät",
      }),
    ).rejects.toThrow(DialogueClosedError);
  });
});

describe("editDialogueMessage", () => {
  it("lets the author edit their own message", async () => {
    const { ownChar, ownUser, entryId } = await setupDialogue();
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    const result = await editDialogueMessage({
      messageId: msg.id,
      authorUserId: ownUser.id,
      bodyMarkdown: "Bearbeitet",
    });

    expect(result.editedAt).not.toBeNull();
    expect(result.characterSlug).toBe(ownChar.slug);
  });

  it("refuses to edit someone else's message", async () => {
    const { partnerUser, entryId } = await setupDialogue();
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    await expect(
      editDialogueMessage({
        messageId: msg.id,
        authorUserId: partnerUser.id,
        bodyMarkdown: "Gehackt",
      }),
    ).rejects.toThrow(DialogueMessageForbiddenError);
  });
});

describe("deleteDialogueMessage", () => {
  it("soft-deletes the message (sets deleted_at, keeps the row)", async () => {
    const { ownUser, entryId } = await setupDialogue();
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    await deleteDialogueMessage({ messageId: msg.id, authorUserId: ownUser.id });

    const [row] = await sql<{ deleted_at: string | null; content: string }[]>`
      SELECT deleted_at, content FROM dialogue_messages WHERE id = ${msg.id}
    `;
    expect(row.deleted_at).not.toBeNull();
    expect(row.content).not.toBe("");
  });

  it("is idempotent when called twice on an already-deleted message", async () => {
    const { ownUser, entryId } = await setupDialogue();
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;
    await deleteDialogueMessage({ messageId: msg.id, authorUserId: ownUser.id });

    await expect(
      deleteDialogueMessage({ messageId: msg.id, authorUserId: ownUser.id }),
    ).resolves.toBeUndefined();
  });
});

describe("setDialogueVisibility", () => {
  it("lets the creator change visibility", async () => {
    const { ownUser, dialogue, entryId } = await setupDialogue();

    const result = await setDialogueVisibility(ownUser.id, entryId, "private");

    expect(result?.slug).toBe(dialogue.slug);
    const [row] = await sql<{ visibility: string }[]>`
      SELECT visibility FROM archive_entries WHERE id = ${entryId}
    `;
    expect(row.visibility).toBe("private");
  });

  it("does not let the partner (non-creator) change visibility", async () => {
    const { partnerUser, entryId } = await setupDialogue();

    const result = await setDialogueVisibility(partnerUser.id, entryId, "private");

    expect(result).toBeNull();
  });
});

describe("deleteDialogue", () => {
  it("deletes the entry, cascades its messages, and writes a content_deletions row", async () => {
    const { partnerChar, entryId, dialogue } = await setupDialogue();
    const admin = await insertUser({ role: "admin" });

    const result = await deleteDialogue(entryId, admin.id);

    expect(result?.slug).toBe(dialogue.slug);
    expect(result?.participantSlugs).toContain(partnerChar.slug);

    const [[remainingEntry], remainingMessages, [deletion]] = await Promise.all([
      sql`SELECT id FROM archive_entries WHERE id = ${entryId}`,
      sql`SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}`,
      sql<{ target_type: string; deleted_by: number }[]>`
        SELECT target_type, deleted_by FROM content_deletions WHERE title = 'Ein Gespräch'
      `,
    ]);
    expect(remainingEntry).toBeUndefined();
    expect(remainingMessages).toHaveLength(0);
    // Dialoge sind technisch archive_entries (category='dialogue') — das
    // Löschprotokoll nutzt entsprechend denselben target_type wie jeder
    // andere gelöschte Archiv-Eintrag, keinen eigenen "dialogue"-Typ.
    expect(deletion.target_type).toBe("archive_entry");
    expect(deletion.deleted_by).toBe(admin.id);
  });
});
