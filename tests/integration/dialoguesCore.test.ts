import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createDialogue,
  postDialogueMessage,
  editDialogueMessage,
  deleteDialogueMessage,
  setDialogueVisibility,
  deleteDialogue,
  restoreDialogue,
  completeDialogue,
  regenerateDialogueContent,
  getClosedDialogueIds,
  inviteDialogueParticipants,
  reserveDialogueReply,
  requestDialogueReservationNotification,
  hasRequestedDialogueReservationNotification,
  getDialogueLockStatus,
  getActiveGMs,
  getAllOpenDialoguesForGM,
  getDialogueParticipant,
  getDialogueParticipantCharacters,
  getDialogueParticipantPlayers,
  getDialoguesForUser,
  DialogueNpcSpeakerRequiredError,
  DialogueClosedError,
  DialogueMessageForbiddenError,
  DialogueSelfReplyError,
  DialogueLockActiveError,
  DialogueReservationRequiredError,
} from "@/lib/dialoguesCore";
import { insertUser, insertCharacter, insertNpcEntry } from "./helpers";

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
    ownSpeaker: { kind: "character", id: ownChar.id },
    partners: [{ kind: "character", id: partnerChar.id }],
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
      ownSpeaker: { kind: "character", id: ownChar.id },
      partners: [{ kind: "character", id: partnerChar.id }],
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

  it("creates a dialogue with more than two participants at once and subscribes/notifies every partner", async () => {
    const ownUser = await insertUser();
    const partnerUser1 = await insertUser();
    const partnerUser2 = await insertUser();
    const ownChar = await insertCharacter({ playerId: ownUser.id, name: "Own" });
    const partnerChar1 = await insertCharacter({
      playerId: partnerUser1.id,
      name: "Partner 1",
    });
    const partnerChar2 = await insertCharacter({
      playerId: partnerUser2.id,
      name: "Partner 2",
    });

    const dialogue = await createDialogue({
      title: "Ein Gespräch zu dritt",
      ownSpeaker: { kind: "character", id: ownChar.id },
      partners: [{ kind: "character", id: partnerChar1.id }, { kind: "character", id: partnerChar2.id }],
      authorUserId: ownUser.id,
      setting: null,
      locationSlug: null,
      logDate: null,
      tags: [],
      bodyMarkdown: "Hallo zusammen!",
      subscribeSelf: true,
    });

    expect(dialogue.partners.map((p) => p.id).sort()).toEqual(
      [partnerUser1.id, partnerUser2.id].sort(),
    );

    const [entry] = await sql<{ metadata: unknown }[]>`
      SELECT metadata FROM archive_entries WHERE slug = ${dialogue.slug}
    `;
    const metadata = entry.metadata as { participants: { slug: string }[] };
    expect(metadata.participants.map((p) => p.slug).sort()).toEqual(
      [ownChar.slug, partnerChar1.slug, partnerChar2.slug].sort(),
    );

    const follows = await sql<{ user_id: number }[]>`
      SELECT user_id FROM content_follows WHERE target_slug = ${dialogue.slug}
    `;
    expect(follows.map((f) => f.user_id).sort()).toEqual(
      [ownUser.id, partnerUser1.id, partnerUser2.id].sort(),
    );
  });

  it("rejects an unresolvable partner character id", async () => {
    const ownUser = await insertUser();
    const partnerUser = await insertUser();
    const ownChar = await insertCharacter({ playerId: ownUser.id });
    const partnerChar = await insertCharacter({ playerId: partnerUser.id });

    await expect(
      createDialogue({
        title: "Ein Gespräch",
        ownSpeaker: { kind: "character", id: ownChar.id },
        partners: [{ kind: "character", id: partnerChar.id }, { kind: "character", id: 999999 }],
        authorUserId: ownUser.id,
        setting: null,
        locationSlug: null,
        logDate: null,
        tags: [],
        bodyMarkdown: "Hallo!",
        subscribeSelf: true,
      }),
    ).rejects.toThrow("Charakter nicht gefunden.");
  });
});

describe("postDialogueMessage", () => {
  it("appends a message from the other participant to an open dialogue", async () => {
    // Die erste Nachricht (aus createDialogue) stammt von ownChar — die
    // Selbst-Antwort-Regel verlangt hier zwingend einen anderen Charakter.
    const { partnerChar, partnerUser, entryId } = await setupDialogue();

    const message = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
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
        speaker: { kind: "character", id: partnerChar.id },
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
        speaker: { kind: "character", id: ownChar.id },
        authorUserId: ownUser.id,
        bodyMarkdown: "Ich rede mit mir selbst",
      }),
    ).rejects.toThrow(DialogueSelfReplyError);
  });

  it("allows a different character to reply after a self-reply attempt would have been blocked", async () => {
    const { ownChar, ownUser, partnerChar, partnerUser, entryId } = await setupDialogue();

    const message = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
      authorUserId: partnerUser.id,
      bodyMarkdown: "Antwort",
    });
    expect(message.characterSlug).toBe(partnerChar.slug);

    // Nach der Antwort des Partners darf ownChar wieder schreiben —
    // die Sperre bezieht sich nur auf zwei aufeinanderfolgende Nachrichten
    // desselben Charakters, nicht auf den Charakter generell.
    const followUp = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: ownChar.id },
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
  it("soft-deletes the entry (keeps messages intact) and writes a content_deletions row", async () => {
    const { partnerChar, entryId, dialogue } = await setupDialogue();
    const admin = await insertUser({ role: "admin" });

    const result = await deleteDialogue(entryId, admin.id);

    expect(result?.slug).toBe(dialogue.slug);
    expect(result?.participantSlugs).toContain(partnerChar.slug);

    const [[entry], remainingMessages, [deletion]] = await Promise.all([
      sql<{ deleted_at: string | null }[]>`
        SELECT deleted_at FROM archive_entries WHERE id = ${entryId}
      `,
      sql`SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}`,
      sql<{ target_type: string; deleted_by: number }[]>`
        SELECT target_type, deleted_by FROM content_deletions WHERE title = 'Ein Gespräch'
      `,
    ]);
    // Soft-Delete: die Zeile bleibt bestehen (deleted_at gesetzt), Nachrichten
    // werden NICHT mitgelöscht — ein späteres Restore soll den vollen
    // Verlauf zurückbekommen (siehe restoreDialogue).
    expect(entry.deleted_at).not.toBeNull();
    expect(remainingMessages).toHaveLength(1);
    // Dialoge sind technisch archive_entries (category='dialogue') — das
    // Löschprotokoll nutzt entsprechend denselben target_type wie jeder
    // andere gelöschte Archiv-Eintrag, keinen eigenen "dialogue"-Typ.
    expect(deletion.target_type).toBe("archive_entry");
    expect(deletion.deleted_by).toBe(admin.id);
  });

  it("restoreDialogue makes a soft-deleted dialogue visible again", async () => {
    const { entryId } = await setupDialogue();
    const admin = await insertUser({ role: "admin" });
    await deleteDialogue(entryId, admin.id);

    const restored = await restoreDialogue(entryId);

    expect(restored).not.toBeNull();
    const [entry] = await sql<{ deleted_at: string | null }[]>`
      SELECT deleted_at FROM archive_entries WHERE id = ${entryId}
    `;
    expect(entry.deleted_at).toBeNull();
  });
});

describe("completeDialogue (Fließtext-Generierung)", () => {
  it("populates content/source_md from the messages in chronological order, without speaker attribution", async () => {
    const { ownChar, ownUser, partnerChar, partnerUser, entryId } = await setupDialogue();
    await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
      authorUserId: partnerUser.id,
      bodyMarkdown: "Zweite Nachricht",
    });
    await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: ownChar.id },
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
      speaker: { kind: "character", id: partnerChar.id },
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

describe("moderator edits on a closed dialogue never overwrite an existing flowing text", () => {
  it("editDialogueMessage does not touch content/source_md when a flowing text already exists", async () => {
    const { partnerUser, entryId } = await setupDialogue();
    await completeDialogue(entryId);
    const [before] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    await editDialogueMessage({
      messageId: msg.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Nachträglich von einem Admin korrigiert",
      isModerator: true,
    });

    const [after] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    // Die Nachricht selbst wurde geändert (dialogue_messages), der bereits
    // beim Abschluss generierte Fließtext bleibt aber unverändert — kein
    // automatisches Resync (siehe regenerateDialogueContent).
    expect(after.source_md).toBe(before.source_md);
    expect(after.source_md).not.toContain("Nachträglich von einem Admin korrigiert");
  });

  it("deleteDialogueMessage does not touch content/source_md when a flowing text already exists", async () => {
    const { partnerChar, partnerUser, entryId } = await setupDialogue();
    const second = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
      authorUserId: partnerUser.id,
      bodyMarkdown: "Bleibt im gespeicherten Fließtext erhalten",
    });
    await completeDialogue(entryId);
    const [before] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;

    await deleteDialogueMessage({
      messageId: second.id,
      authorUserId: partnerUser.id,
      isModerator: true,
    });

    const [after] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    expect(after.source_md).toBe(before.source_md);
    expect(after.source_md).toContain("Bleibt im gespeicherten Fließtext erhalten");
  });

  it("lazily backfills the flowing text on a moderator edit if none was ever generated", async () => {
    // Simuliert einen alten, geschlossenen Dialog von vor Einführung des
    // Fließtext-Features (noch nicht per Backfill befüllt).
    const { partnerUser, entryId } = await setupDialogue();
    await sql`
      UPDATE archive_entries SET dialogue_open = FALSE, content = '', source_md = ''
      WHERE id = ${entryId}
    `;
    const [msg] = await sql<{ id: number }[]>`
      SELECT id FROM dialogue_messages WHERE archive_entry_id = ${entryId}
    `;

    await editDialogueMessage({
      messageId: msg.id,
      authorUserId: partnerUser.id,
      bodyMarkdown: "Erste Bearbeitung nach altem Abschluss",
      isModerator: true,
    });

    const [row] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entryId}
    `;
    expect(row.source_md).toContain("Erste Bearbeitung nach altem Abschluss");
  });
});

// Der Backfill läuft in Produktion BATCH-weise über eine stabile Liste
// (getClosedDialogueIds, per offset durchlaufen — siehe
// DialogueContentRegeneratePanel.tsx / regenerateDialogueContentBatchAction).
// Dieser Helfer spiegelt genau diesen Durchlauf über den DB-Primitiven und gibt
// die Zahl der erzeugten Fließtexte zurück.
async function backfillAllClosedDialogueContent(): Promise<number> {
  const ids = await getClosedDialogueIds();
  let changed = 0;
  for (const id of ids) {
    if (await regenerateDialogueContent(sql, id)) changed++;
  }
  return changed;
}

describe("Dialog-Fließtext-Backfill (Batch)", () => {
  it("backfills content for closed dialogues and leaves open ones untouched", async () => {
    const closed = await setupDialogue();
    const open = await setupDialogue();
    // Simuliert einen vor Einführung des Features geschlossenen Dialog:
    // dialogue_open = FALSE, aber content/source_md noch leer.
    await sql`
      UPDATE archive_entries SET dialogue_open = FALSE, content = '', source_md = ''
      WHERE id = ${closed.entryId}
    `;

    const count = await backfillAllClosedDialogueContent();

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

  it("is idempotent — a second run reports 0 once every closed dialogue already has a flowing text", async () => {
    const { entryId } = await setupDialogue();
    await completeDialogue(entryId);

    const count = await backfillAllClosedDialogueContent();

    expect(count).toBe(0);
  });
});

// Erweitert eine per setupDialogue() angelegte 2-Personen-Unterhaltung um
// einen dritten Charakter — Grundlage für alle Tests, die eine Reservierung
// erfordern (nur bei mehr als zwei Teilnehmenden relevant, siehe
// postDialogueMessage).
async function setupTriDialogue() {
  const base = await setupDialogue();
  const thirdUser = await insertUser();
  const thirdChar = await insertCharacter({
    playerId: thirdUser.id,
    name: "Dritte",
  });

  const { invited } = await inviteDialogueParticipants(base.entryId, [
    { kind: "character", id: thirdChar.id },
  ]);

  return { ...base, thirdUser, thirdChar, invited };
}

describe("inviteDialogueParticipants", () => {
  it("appends a new participant to metadata.participants and subscribes their player", async () => {
    const { entryId, dialogue } = await setupDialogue();
    const thirdUser = await insertUser();
    const thirdChar = await insertCharacter({
      playerId: thirdUser.id,
      name: "Dritte",
    });

    const { invited } = await inviteDialogueParticipants(entryId, [
      { kind: "character", id: thirdChar.id },
    ]);

    expect(invited.map((i) => i.id)).toEqual([thirdUser.id]);

    const [entry] = await sql<{ metadata: { participants: { slug: string }[] } }[]>`
      SELECT metadata FROM archive_entries WHERE id = ${entryId}
    `;
    const slugs = entry.metadata.participants.map((p) => p.slug);
    expect(slugs).toHaveLength(3);
    expect(slugs).toContain(thirdChar.slug);

    const follow = await sql<{ subscribed_at: string | null }[]>`
      SELECT subscribed_at FROM content_follows
      WHERE user_id = ${thirdUser.id} AND target_type = 'archive_entry' AND target_slug = ${dialogue.slug}
    `;
    expect(follow).toHaveLength(1);
    expect(follow[0].subscribed_at).not.toBeNull();
  });

  it("silently skips characters that already participate, without a duplicate or an error", async () => {
    const { entryId, ownChar } = await setupDialogue();

    const { invited } = await inviteDialogueParticipants(entryId, [
      { kind: "character", id: ownChar.id },
    ]);

    expect(invited).toEqual([]);
    const [entry] = await sql<{ metadata: { participants: unknown[] } }[]>`
      SELECT metadata FROM archive_entries WHERE id = ${entryId}
    `;
    expect(entry.metadata.participants).toHaveLength(2);
  });
});

describe("reserveDialogueReply / getDialogueLockStatus", () => {
  it("grants the reservation when no active lock exists", async () => {
    const { entryId, ownUser } = await setupTriDialogue();

    await reserveDialogueReply(entryId, ownUser.id);

    const status = await getDialogueLockStatus(entryId);
    expect(status?.heldByUserId).toBe(ownUser.id);
  });

  it("rejects a reservation attempt while another person's lock is still active", async () => {
    const { entryId, ownUser, partnerUser } = await setupTriDialogue();
    await reserveDialogueReply(entryId, ownUser.id);

    await expect(
      reserveDialogueReply(entryId, partnerUser.id),
    ).rejects.toBeInstanceOf(DialogueLockActiveError);
  });

  it("allows re-reserving once the previous holder's lock has expired", async () => {
    const { entryId, ownUser, partnerUser } = await setupTriDialogue();
    await reserveDialogueReply(entryId, ownUser.id);
    await sql`
      UPDATE dialogue_reservations SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE archive_entry_id = ${entryId}
    `;

    await reserveDialogueReply(entryId, partnerUser.id);

    const status = await getDialogueLockStatus(entryId);
    expect(status?.heldByUserId).toBe(partnerUser.id);
  });

  it("getDialogueLockStatus treats an expired-but-not-yet-cleaned-up row as no active lock", async () => {
    const { entryId, ownUser } = await setupTriDialogue();
    await reserveDialogueReply(entryId, ownUser.id);
    await sql`
      UPDATE dialogue_reservations SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE archive_entry_id = ${entryId}
    `;

    expect(await getDialogueLockStatus(entryId)).toBeNull();
  });

  it("re-reserving by the same holder before expiry is a no-op, not an error", async () => {
    const { entryId, ownUser } = await setupTriDialogue();
    await reserveDialogueReply(entryId, ownUser.id);

    await expect(
      reserveDialogueReply(entryId, ownUser.id),
    ).resolves.not.toThrow();
  });
});

describe("requestDialogueReservationNotification", () => {
  it("records the opt-in and hasRequestedDialogueReservationNotification reflects it", async () => {
    const { entryId, partnerUser } = await setupTriDialogue();

    expect(
      await hasRequestedDialogueReservationNotification(entryId, partnerUser.id),
    ).toBe(false);

    await requestDialogueReservationNotification(entryId, partnerUser.id);

    expect(
      await hasRequestedDialogueReservationNotification(entryId, partnerUser.id),
    ).toBe(true);
  });

  it("a second opt-in for the same user/dialogue is a no-op, not a conflict error", async () => {
    const { entryId, partnerUser } = await setupTriDialogue();
    await requestDialogueReservationNotification(entryId, partnerUser.id);

    await expect(
      requestDialogueReservationNotification(entryId, partnerUser.id),
    ).resolves.not.toThrow();
  });
});

describe("postDialogueMessage with more than two participants", () => {
  it("rejects a reply when nobody has reserved the right to answer yet", async () => {
    const { entryId, partnerChar, partnerUser } = await setupTriDialogue();

    await expect(
      postDialogueMessage({
        archiveEntryId: entryId,
        speaker: { kind: "character", id: partnerChar.id },
        authorUserId: partnerUser.id,
        bodyMarkdown: "Ich antworte einfach mal ungefragt",
      }),
    ).rejects.toBeInstanceOf(DialogueReservationRequiredError);
  });

  it("rejects a reply from someone other than the person holding the reservation", async () => {
    const { entryId, ownUser, partnerChar, partnerUser } = await setupTriDialogue();
    await reserveDialogueReply(entryId, ownUser.id);

    await expect(
      postDialogueMessage({
        archiveEntryId: entryId,
        speaker: { kind: "character", id: partnerChar.id },
        authorUserId: partnerUser.id,
        bodyMarkdown: "Ich war aber nicht dran",
      }),
    ).rejects.toBeInstanceOf(DialogueLockActiveError);
  });

  it("allows the reservation holder to reply and releases the lock afterwards", async () => {
    const { entryId, partnerChar, partnerUser } = await setupTriDialogue();
    await reserveDialogueReply(entryId, partnerUser.id);

    const msg = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
      authorUserId: partnerUser.id,
      bodyMarkdown: "Jetzt bin ich dran",
    });

    expect(msg.characterId).toBe(partnerChar.id);
    expect(await getDialogueLockStatus(entryId)).toBeNull();
  });

  it("does not silently drop a pending notify-request when cleaning up an expired reservation on a rejected reply attempt", async () => {
    // Regression: postDialogueMessage muss abgelaufene Reservierungen
    // aufräumen können, ohne die dabei noch bestehenden Notify-Requests zu
    // verlieren — die werden stattdessen beim nächsten reserveDialogueReply
    // für diesen Dialog benachrichtigt (siehe deleteExpiredReservationRow).
    const { entryId, ownUser, partnerChar, partnerUser, thirdUser } =
      await setupTriDialogue();
    await reserveDialogueReply(entryId, ownUser.id);
    await requestDialogueReservationNotification(entryId, thirdUser.id);
    await sql`
      UPDATE dialogue_reservations SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE archive_entry_id = ${entryId}
    `;

    // Löst die Ablauf-Bereinigung aus, schlägt aber selbst fehl (niemand hat
    // sich neu reserviert) — die Notify-Anfrage darf hierbei nicht verloren
    // gehen.
    await expect(
      postDialogueMessage({
        archiveEntryId: entryId,
        speaker: { kind: "character", id: partnerChar.id },
        authorUserId: partnerUser.id,
        bodyMarkdown: "Reserviere zuerst",
      }),
    ).rejects.toBeInstanceOf(DialogueReservationRequiredError);

    expect(
      await hasRequestedDialogueReservationNotification(entryId, thirdUser.id),
    ).toBe(true);

    // Die nächste erfolgreiche Reservierung räumt die (immer noch
    // abgelaufene) Zeile endgültig weg und meldet die wartende Notify-Anfrage.
    const { released } = await reserveDialogueReply(entryId, partnerUser.id);
    expect(released?.notifyTargets.map((t) => t.id)).toEqual([thirdUser.id]);
  });

  it("clears pending notify-requests silently when the lock ends via the holder's own reply", async () => {
    const { entryId, partnerChar, partnerUser, thirdUser } =
      await setupTriDialogue();
    await reserveDialogueReply(entryId, partnerUser.id);
    await requestDialogueReservationNotification(entryId, thirdUser.id);

    await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
      authorUserId: partnerUser.id,
      bodyMarkdown: "So, jetzt bin ich dran",
    });

    expect(
      await hasRequestedDialogueReservationNotification(entryId, thirdUser.id),
    ).toBe(false);
  });
});

describe("postDialogueMessage with exactly two participants", () => {
  it("keeps working without any reservation, unaffected by the lock mechanism", async () => {
    const { entryId, partnerChar, partnerUser } = await setupDialogue();

    const msg = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "character", id: partnerChar.id },
      authorUserId: partnerUser.id,
      bodyMarkdown: "Ganz normal, keine Reservierung nötig",
    });

    expect(msg.characterId).toBe(partnerChar.id);
  });
});

describe("getActiveGMs", () => {
  it("returns only active gm accounts, excluding the given user and other roles", async () => {
    const excluded = await insertUser({ role: "gm" });
    const gm = await insertUser({ role: "gm" });
    const inactiveGm = await insertUser({ role: "gm", isActive: false });
    await insertUser({ role: "admin" });
    await insertUser({ role: "player" });

    const gms = await getActiveGMs(excluded.id);
    const ids = gms.map((g) => g.id);

    expect(ids).toContain(gm.id);
    expect(ids).not.toContain(excluded.id);
    expect(ids).not.toContain(inactiveGm.id);
  });
});

describe("getAllOpenDialoguesForGM", () => {
  it("lists an open dialogue even though the caller is not a participant", async () => {
    const { dialogue } = await setupDialogue();

    const overview = await getAllOpenDialoguesForGM();
    const item = overview.find((d) => d.slug === dialogue.slug);

    // "Own"/"Partner" sind die in setupDialogue() vergebenen Charakternamen.
    expect(item).toBeDefined();
    expect(item?.participantNames.sort()).toEqual(["Own", "Partner"].sort());
  });

  it("excludes closed dialogues", async () => {
    const { dialogue, entryId } = await setupDialogue();
    await completeDialogue(entryId);

    const overview = await getAllOpenDialoguesForGM();

    expect(overview.some((d) => d.slug === dialogue.slug)).toBe(false);
  });

  it("excludes deleted dialogues", async () => {
    const { dialogue, entryId, ownUser } = await setupDialogue();
    await deleteDialogue(entryId, ownUser.id);

    const overview = await getAllOpenDialoguesForGM();

    expect(overview.some((d) => d.slug === dialogue.slug)).toBe(false);
  });
});

// ── Gespräche mit NPCs ──────────────────────────────────────────────────
// NPC = Datenbank-Eintrag der Kategorie "npc" (kein Charakter). Für ihn
// schreibt in genau diesem Gespräch ein GM-Konto (dialogue_npc_speakers).
async function setupNpcDialogue() {
  const playerUser = await insertUser();
  const gmUser = await insertUser();
  const playerChar = await insertCharacter({
    playerId: playerUser.id,
    name: "Spielerin",
  });
  const npc = await insertNpcEntry({ title: "Barkeeper" });

  const dialogue = await createDialogue({
    title: "Ein Abend in der Bar",
    ownSpeaker: { kind: "character", id: playerChar.id },
    partners: [{ kind: "npc", id: npc.id }],
    authorUserId: playerUser.id,
    setting: null,
    locationSlug: null,
    logDate: null,
    tags: [],
    bodyMarkdown: "Einen Raktajino, bitte.",
    npcSpeakerUserId: gmUser.id,
    subscribeSelf: true,
  });

  const [entry] = await sql<{ id: number }[]>`
    SELECT id FROM archive_entries WHERE slug = ${dialogue.slug}
  `;
  return { playerUser, gmUser, playerChar, npc, dialogue, entryId: entry.id };
}

describe("Gespräche mit NPCs", () => {
  it("ordnet den NPC dem gewählten GM-Konto zu und abonniert es", async () => {
    const { gmUser, npc, dialogue, entryId } = await setupNpcDialogue();

    const rows = await sql<{ npc_entry_id: number; user_id: number }[]>`
      SELECT npc_entry_id, user_id FROM dialogue_npc_speakers
      WHERE archive_entry_id = ${entryId}
    `;
    expect(rows).toEqual([{ npc_entry_id: npc.id, user_id: gmUser.id }]);

    const [follow] = await sql<{ user_id: number }[]>`
      SELECT user_id FROM content_follows
      WHERE user_id = ${gmUser.id} AND target_type = 'archive_entry'
        AND target_slug = ${dialogue.slug}
    `;
    expect(follow).toBeDefined();
  });

  it("macht das GM-Konto zum Teilnehmer und lässt es als NPC antworten", async () => {
    const { gmUser, npc, entryId } = await setupNpcDialogue();

    const mine = await getDialogueParticipantCharacters(entryId, gmUser.id);
    expect(mine.map((c) => c.speaker)).toEqual([{ kind: "npc", id: npc.id }]);
    expect(await getDialogueParticipant(entryId, gmUser.id)).toMatchObject({
      speaker: { kind: "npc", id: npc.id },
    });

    const message = await postDialogueMessage({
      archiveEntryId: entryId,
      speaker: { kind: "npc", id: npc.id },
      authorUserId: gmUser.id,
      bodyMarkdown: "Kommt sofort.",
    });
    expect(message.characterName).toBe("Barkeeper");
  });

  it("zählt das Gespräch zu den Gesprächen des GM-Kontos", async () => {
    const { gmUser, dialogue } = await setupNpcDialogue();

    const dialogues = await getDialoguesForUser(gmUser.id);
    const own = dialogues.find((d) => d.slug === dialogue.slug);

    expect(own).toBeDefined();
    expect(own?.characterName).toBe("Barkeeper");
    expect(own?.partnerName).toBe("Spielerin");
  });

  // getDialoguesForUser holt seit dem Performance-Umbau ALLE eigenen
  // Charaktere in EINER Abfrage (vorher eine pro Charakter, sequentiell).
  // Dieser Test sichert genau das ab: mit zwei Charakteren in zwei
  // verschiedenen Gesprächen müssen beide auftauchen — und jedes mit dem
  // Charakter benannt sein, über den es zum Konto gehört. Ein früherer
  // Umbau-Versuch verlor hier still ein Gespräch.
  it("findet Gespräche über MEHRERE eigene Charaktere hinweg", async () => {
    const ownUser = await insertUser();
    const partnerUser = await insertUser();
    const charA = await insertCharacter({ playerId: ownUser.id, name: "Alpha" });
    const charB = await insertCharacter({ playerId: ownUser.id, name: "Beta" });
    const partnerChar = await insertCharacter({
      playerId: partnerUser.id,
      name: "Gegenüber",
    });

    const base = {
      partners: [{ kind: "character" as const, id: partnerChar.id }],
      authorUserId: ownUser.id,
      setting: null,
      locationSlug: null,
      logDate: null,
      tags: [],
      bodyMarkdown: "Hallo!",
      subscribeSelf: false,
    };
    const dialogA = await createDialogue({
      ...base,
      title: "Gespräch von Alpha",
      ownSpeaker: { kind: "character", id: charA.id },
    });
    const dialogB = await createDialogue({
      ...base,
      title: "Gespräch von Beta",
      ownSpeaker: { kind: "character", id: charB.id },
    });

    const dialogues = await getDialoguesForUser(ownUser.id);
    const bySlug = new Map(dialogues.map((d) => [d.slug, d]));

    expect(bySlug.has(dialogA.slug)).toBe(true);
    expect(bySlug.has(dialogB.slug)).toBe(true);
    expect(bySlug.get(dialogA.slug)?.characterName).toBe("Alpha");
    expect(bySlug.get(dialogB.slug)?.characterName).toBe("Beta");
    expect(bySlug.get(dialogA.slug)?.partnerName).toBe("Gegenüber");
  });

  // Robustheit: eine Dialog-Zeile, deren metadata.participants KEIN Array ist
  // (Objekt/Skalar), darf die gesamte Liste nicht zum Absturz bringen. Der
  // frühere @>-Containment-Operator übersprang solche Zeilen still; die
  // gebündelte Query nutzt dafür einen CASE-Guard um jsonb_array_elements
  // (das sonst „cannot extract elements from an object" wirft).
  it("überspringt Gespräche mit kaputtem participants-Feld statt zu werfen", async () => {
    const ownUser = await insertUser();
    const partnerUser = await insertUser();
    const ownChar = await insertCharacter({
      playerId: ownUser.id,
      name: "Heil",
    });
    const partnerChar = await insertCharacter({
      playerId: partnerUser.id,
      name: "Partner",
    });

    const good = await createDialogue({
      title: "Heiles Gespräch",
      ownSpeaker: { kind: "character", id: ownChar.id },
      partners: [{ kind: "character", id: partnerChar.id }],
      authorUserId: ownUser.id,
      setting: null,
      locationSlug: null,
      logDate: null,
      tags: [],
      bodyMarkdown: "Hallo!",
      subscribeSelf: false,
    });

    // Eine bewusst fehlgeformte Dialog-Zeile direkt einschleusen (participants
    // als Objekt statt Array) — das kann createDialogue selbst nicht erzeugen.
    // dialogue_open = true, damit die Zeile den offen-Filter passiert und
    // tatsächlich in die EXISTS-Auswertung (jsonb_array_elements) gerät — sonst
    // liefe der Test am kritischen Pfad vorbei.
    await sql`
      INSERT INTO archive_entries (slug, title, category, visibility, content, dialogue_open, metadata)
      VALUES (
        'kaputt-participants',
        'Kaputt',
        'dialogue',
        'public',
        '',
        true,
        ${sql.json({ participants: {} })}
      )
    `;

    const dialogues = await getDialoguesForUser(ownUser.id);
    // Wirft nicht, und das gesunde Gespräch ist weiterhin dabei.
    expect(dialogues.map((d) => d.slug)).toContain(good.slug);
    expect(dialogues.map((d) => d.slug)).not.toContain("kaputt-participants");
  });

  it("benachrichtigt den NPC-Sprecher wie einen Teilnehmer", async () => {
    const { gmUser, playerChar, npc, entryId } = await setupNpcDialogue();

    const [charRow] = await sql<{ slug: string }[]>`
      SELECT slug FROM characters WHERE id = ${playerChar.id}
    `;
    const targets = await getDialogueParticipantPlayers(
      [charRow.slug, npc.slug],
      entryId,
    );

    expect(targets.map((t) => t.id)).toContain(gmUser.id);
  });

  it("holt einen NPC auch nachträglich ins laufende Gespräch", async () => {
    const { gmUser, entryId, dialogue } = await setupNpcDialogue();
    const zweiterNpc = await insertNpcEntry({ title: "Wirtin" });

    const { invited } = await inviteDialogueParticipants(
      entryId,
      [{ kind: "npc", id: zweiterNpc.id }],
      gmUser.id,
    );
    // Ein NPC hat keinen Spieler, den man anschreiben könnte — die
    // Einladungs-Mails gehen nur an Charakter-Spieler.
    expect(invited).toEqual([]);

    const [entry] = await sql<
      { metadata: { participants: { slug: string; kind: string }[] } }[]
    >`
      SELECT metadata FROM archive_entries WHERE id = ${entryId}
    `;
    expect(entry.metadata.participants).toContainEqual({
      slug: zweiterNpc.slug,
      name: "Wirtin",
      kind: "archive",
    });

    // Der Einladende spricht ihn ab jetzt in diesem Gespräch …
    const speakers = await sql<{ npc_entry_id: number }[]>`
      SELECT npc_entry_id FROM dialogue_npc_speakers
      WHERE archive_entry_id = ${entryId} AND user_id = ${gmUser.id}
      ORDER BY npc_entry_id
    `;
    expect(speakers.map((r) => r.npc_entry_id)).toContain(zweiterNpc.id);

    // … und bleibt auf das Gespräch abonniert.
    const [follow] = await sql<{ user_id: number }[]>`
      SELECT user_id FROM content_follows
      WHERE user_id = ${gmUser.id} AND target_type = 'archive_entry'
        AND target_slug = ${dialogue.slug}
    `;
    expect(follow).toBeDefined();
  });

  it("holt einen NPC-Entwurf nicht ins Gespräch", async () => {
    const { gmUser, entryId } = await setupNpcDialogue();
    const entwurf = await insertNpcEntry({ title: "Geheimer NPC", isDraft: true });

    const { invited } = await inviteDialogueParticipants(
      entryId,
      [{ kind: "npc", id: entwurf.id }],
      gmUser.id,
    );
    expect(invited).toEqual([]);

    const [entry] = await sql<
      { metadata: { participants: { slug: string }[] } }[]
    >`
      SELECT metadata FROM archive_entries WHERE id = ${entryId}
    `;
    expect(entry.metadata.participants.map((p) => p.slug)).not.toContain(
      entwurf.slug,
    );
  });

  it("lässt einen nachträglich eingeladenen NPC ohne Spielleitung nicht zu", async () => {
    const { entryId } = await setupNpcDialogue();
    const zweiterNpc = await insertNpcEntry();

    await expect(
      inviteDialogueParticipants(entryId, [
        { kind: "npc", id: zweiterNpc.id },
      ]),
    ).rejects.toBeInstanceOf(DialogueNpcSpeakerRequiredError);
  });

  it("lehnt einen NPC ohne benannte Spielleitung ab", async () => {
    const playerUser = await insertUser();
    const playerChar = await insertCharacter({ playerId: playerUser.id });
    const npc = await insertNpcEntry();

    await expect(
      createDialogue({
        title: "Ohne Sprecher",
        ownSpeaker: { kind: "character", id: playerChar.id },
        partners: [{ kind: "npc", id: npc.id }],
        authorUserId: playerUser.id,
        setting: null,
        locationSlug: null,
        logDate: null,
        tags: [],
        bodyMarkdown: "Hallo?",
        npcSpeakerUserId: null,
        subscribeSelf: true,
      }),
    ).rejects.toBeInstanceOf(DialogueNpcSpeakerRequiredError);
  });
});
