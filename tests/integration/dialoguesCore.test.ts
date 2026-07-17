import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createDialogue,
  postDialogueMessage,
  editDialogueMessage,
  deleteDialogueMessage,
  setDialogueVisibility,
  deleteDialogue,
  completeDialogue,
  regenerateAllClosedDialogueContent,
  DialogueClosedError,
  DialogueMessageForbiddenError,
  DialogueSelfReplyError,
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
  it("appends a message from the other participant to an open dialogue", async () => {
    // Die erste Nachricht (aus createDialogue) stammt von ownChar — die
    // Selbst-Antwort-Regel verlangt hier zwingend einen anderen Charakter.
    const { partnerChar, partnerUser, entryId } = await setupDialogue();

    const message = await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: partnerChar.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Zweite Nachricht",
    });

    expect(message.characterSlug).toBe(partnerChar.slug);
    const rows = await sql`SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}`;
    expect(rows).toHaveLength(2);
  });

  it("refuses to post to a closed dialogue", async () => {
    const { partnerChar, partnerUser, entryId } = await setupDialogue();
    await sql`UPDATE archive_entries SET dialogue_open = FALSE WHERE id = ${entryId}`;

    await expect(
      postDialogueMessage({
        archiveEntryId: entryId,
        characterId: partnerChar.id,
        authorUserId: partnerUser.id,
        bodyMarkdown: "Zu spät",
      }),
    ).rejects.toThrow(DialogueClosedError);
  });

  it("refuses a second message in a row from the same character (no self-reply)", async () => {
    const { ownChar, ownUser, entryId } = await setupDialogue();

    await expect(
      postDialogueMessage({
        archiveEntryId: entryId,
        characterId: ownChar.id,
        authorUserId: ownUser.id,
        bodyMarkdown: "Ich rede mit mir selbst",
      }),
    ).rejects.toThrow(DialogueSelfReplyError);
  });

  it("allows a different character to reply after a self-reply attempt would have been blocked", async () => {
    const { ownChar, ownUser, partnerChar, partnerUser, entryId } = await setupDialogue();

    const message = await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: partnerChar.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Antwort",
    });
    expect(message.characterSlug).toBe(partnerChar.slug);

    // Nach der Antwort des Partners darf ownChar wieder schreiben —
    // die Sperre bezieht sich nur auf zwei aufeinanderfolgende Nachrichten
    // desselben Charakters, nicht auf den Charakter generell.
    const followUp = await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: ownChar.id,
      authorUserId: ownUser.id,
      bodyMarkdown: "Wieder ownChar",
    });
    expect(followUp.characterSlug).toBe(ownChar.slug);
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

  it("isModerator bypasses both the author check and the closed-dialogue check", async () => {
    const { partnerUser, entryId } = await setupDialogue();
    await sql`UPDATE archive_entries SET dialogue_open = FALSE WHERE id = ${entryId}`;
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    // partnerUser ist weder Autor der Nachricht noch (in diesem reinen
    // Core-Test) irgendeine Rolle zugeordnet — isModerator umgeht beide
    // Prüfungen unabhängig davon, wer die Rolle letztlich zuweist (das
    // entscheidet actions/dialogues.ts, nicht dialoguesCore.ts).
    const result = await editDialogueMessage({
      messageId: msg.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Moderiert",
      isModerator: true,
    });

    expect(result.content).toContain("Moderiert");
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

  it("isModerator deletes someone else's message in a closed dialogue", async () => {
    const { partnerUser, entryId } = await setupDialogue();
    await sql`UPDATE archive_entries SET dialogue_open = FALSE WHERE id = ${entryId}`;
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    await deleteDialogueMessage({
      messageId: msg.id,
      authorUserId: partnerUser.id,
      isModerator: true,
    });

    const [row] = await sql<{ deleted_at: string | null }[]>`
      SELECT deleted_at FROM dialogue_messages WHERE id = ${msg.id}
    `;
    expect(row.deleted_at).not.toBeNull();
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

describe("completeDialogue (Fließtext-Generierung)", () => {
  it("populates content/source_md from the messages in chronological order, without speaker attribution", async () => {
    const { ownChar, ownUser, partnerChar, partnerUser, entryId } = await setupDialogue();
    await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: partnerChar.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Zweite Nachricht",
    });
    await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: ownChar.id,
      authorUserId: ownUser.id,
      bodyMarkdown: "Dritte Nachricht",
    });

    await completeDialogue(entryId);

    const [row] = await sql<{ content: string; source_md: string; dialogue_open: boolean }[]>`
      SELECT content, source_md, dialogue_open FROM archive_entries WHERE id = ${entryId}
    `;
    expect(row.dialogue_open).toBe(false);
    expect(row.content.indexOf("Hallo")).toBeLessThan(row.content.indexOf("Zweite"));
    expect(row.content.indexOf("Zweite")).toBeLessThan(row.content.indexOf("Dritte"));
    expect(row.source_md).toContain("Hallo");
    expect(row.source_md).toContain("Zweite Nachricht");
    expect(row.source_md).toContain("Dritte Nachricht");
  });

  it("omits deleted messages from the generated flowing text", async () => {
    const { partnerChar, partnerUser, entryId } = await setupDialogue();
    const second = await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: partnerChar.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Wird gelöscht",
    });
    await deleteDialogueMessage({ messageId: second.id, authorUserId: partnerUser.id });

    await completeDialogue(entryId);

    const [row] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    expect(row.source_md).not.toContain("Wird gelöscht");
  });
});

describe("moderator edits on a closed dialogue regenerate the flowing text", () => {
  it("editDialogueMessage keeps content/source_md in sync when a moderator edits a message after closing", async () => {
    const { partnerUser, entryId } = await setupDialogue();
    await completeDialogue(entryId);
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    await editDialogueMessage({
      messageId: msg.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Nachträglich von einem Admin korrigiert",
      isModerator: true,
    });

    const [row] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    expect(row.source_md).toContain("Nachträglich von einem Admin korrigiert");
  });

  it("deleteDialogueMessage keeps content/source_md in sync when a moderator deletes a message after closing", async () => {
    const { partnerChar, partnerUser, entryId } = await setupDialogue();
    const second = await postDialogueMessage({
      archiveEntryId: entryId,
      characterId: partnerChar.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Wird nach Abschluss von einem Admin gelöscht",
    });
    await completeDialogue(entryId);

    await deleteDialogueMessage({
      messageId: second.id,
      authorUserId: partnerUser.id,
      isModerator: true,
    });

    const [row] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    expect(row.source_md).not.toContain("Wird nach Abschluss von einem Admin gelöscht");
  });
});

describe("regenerateAllClosedDialogueContent", () => {
  it("backfills content for closed dialogues and leaves open ones untouched", async () => {
    const closed = await setupDialogue();
    const open = await setupDialogue();
    // Simuliert einen vor Einführung des Features geschlossenen Dialog:
    // dialogue_open = FALSE, aber content/source_md noch leer.
    await sql`
      UPDATE archive_entries SET dialogue_open = FALSE, content = '', source_md = ''
      WHERE id = ${closed.entryId}
    `;

    const count = await regenerateAllClosedDialogueContent();

    expect(count).toBeGreaterThanOrEqual(1);
    const [closedRow] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${closed.entryId}
    `;
    expect(closedRow.source_md).toContain("Hallo");

    const [openRow] = await sql<{ source_md: string | null; dialogue_open: boolean }[]>`
      SELECT source_md, dialogue_open FROM archive_entries WHERE id = ${open.entryId}
    `;
    expect(openRow.dialogue_open).toBe(true);
    // Ein frisch angelegter, noch offener Dialog hat nie ein source_md
    // gesetzt bekommen (DB-Default NULL, keine leere Zeichenkette) — anders
    // als der zuvor manuell auf '' gesetzte "closed"-Testfall oben.
    expect(openRow.source_md).toBeNull();
  });
});
