import { describe, expect, it } from "vitest";
import sql from "@/lib/db";
import { deleteNote, listNotesForUser, updateNote } from "@/lib/contentNotes";
import { makeViewer } from "@/lib/visibility";
import { insertCharacter, insertUser } from "./helpers";

describe("persönliche Notizübersicht", () => {
  it("zeigt eigene und freigegebene Notizen nur zu sichtbaren Einträgen", async () => {
    const user = await insertUser();
    const other = await insertUser();
    const visible = await insertCharacter({ playerId: user.id });
    const hidden = await insertCharacter({ playerId: other.id, isDraft: true });
    await sql`
      INSERT INTO content_notes (content_type, content_slug, author_id, body, visibility)
      VALUES
        ('character', ${visible.slug}, ${user.id}, 'Privat', 'private'),
        ('character', ${visible.slug}, ${other.id}, 'Geteilt', 'group'),
        ('character', ${visible.slug}, ${other.id}, 'Fremd privat', 'private'),
        ('character', ${hidden.slug}, ${other.id}, 'Verborgener Entwurf', 'group')
    `;
    const notes = await listNotesForUser(makeViewer(user.id, ["player"]));
    expect(notes.map((note) => note.body)).toEqual(["Geteilt", "Privat"]);
    expect(notes[0].canEdit).toBe(false);
    expect(notes[1].canEdit).toBe(true);
    expect(notes[1].targetHref).toBe(`/characters/${visible.slug}`);
  });

  it("erlaubt Bearbeiten und Löschen nur dem Autor oder der Moderation", async () => {
    const user = await insertUser();
    const other = await insertUser();
    const character = await insertCharacter({ playerId: user.id });
    const [note] = await sql<{ id: number }[]>`
      INSERT INTO content_notes (content_type, content_slug, author_id, body, visibility)
      VALUES ('character', ${character.slug}, ${user.id}, 'Alt', 'private')
      RETURNING id
    `;
    const owner = makeViewer(user.id, ["player"]);
    const foreign = makeViewer(other.id, ["player"]);
    expect(await updateNote(note.id, foreign, "Fremd")).toBe(false);
    expect(await deleteNote(note.id, foreign)).toBe(false);
    expect(await updateNote(note.id, owner, "Neu")).toBe(true);
    expect((await listNotesForUser(owner))[0].body).toBe("Neu");
    expect(await deleteNote(note.id, owner)).toBe(true);
  });
});
