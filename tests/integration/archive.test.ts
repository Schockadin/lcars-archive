import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createArchiveEntry,
  updateOwnArchiveEntryContent,
  setArchiveEntryDraft,
  getOwnArchiveEntryForEdit,
  setArchiveEntryOwner,
} from "@/lib/archive";
import { getNpcOptions } from "@/lib/archive";
import { canView } from "@/lib/visibility";
import { createDialogue } from "@/lib/dialoguesCore";
import { insertUser, insertCharacter, insertNpcEntry } from "./helpers";

function baseEntryInput(
  overrides: Partial<Parameters<typeof createArchiveEntry>[0]> = {},
) {
  return {
    title: "Deep Space 12",
    category: "location" as const,
    tags: [],
    summary: null,
    aliases: [],
    attributeValues: {},
    referenceValues: {},
    bodyMarkdown: "",
    ownerUserId: 0,
    isDraft: false,
    ...overrides,
  };
}

describe("createArchiveEntry", () => {
  it("creates an entry owned by the given user, published by default", async () => {
    const user = await insertUser();

    const result = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id }),
    );

    const [row] = await sql<{ owner_user_id: number; is_draft: boolean }[]>`
      SELECT owner_user_id, is_draft FROM archive_entries WHERE id = ${result.id}
    `;
    expect(row.owner_user_id).toBe(user.id);
    expect(row.is_draft).toBe(false);
  });

  it("resolves a reference field into an archive_links row", async () => {
    const user = await insertUser();
    const npc = await createArchiveEntry(
      baseEntryInput({
        ownerUserId: user.id,
        title: "Ein NPC",
        category: "npc",
      }),
    );

    const location = await createArchiveEntry(
      baseEntryInput({
        ownerUserId: user.id,
        title: "Ein Ort",
        referenceValues: { related_npcs: npc.slug },
      }),
    );

    const [link] = await sql<{ target_id: number; label: string }[]>`
      SELECT target_id, label FROM archive_links WHERE source_id = ${location.id}
    `;
    expect(link.target_id).toBe(npc.id);
    expect(link.label).toBe("NPC");
  });
});

describe("updateOwnArchiveEntryContent", () => {
  it("updates the entry and replaces its reference links when the requester is the owner", async () => {
    const user = await insertUser();
    const npcA = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id, title: "NPC A", category: "npc" }),
    );
    const npcB = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id, title: "NPC B", category: "npc" }),
    );
    const location = await createArchiveEntry(
      baseEntryInput({
        ownerUserId: user.id,
        referenceValues: { related_npcs: npcA.slug },
      }),
    );

    const result = await updateOwnArchiveEntryContent(
      user.id,
      location.id,
      baseEntryInput({
        title: "Neuer Titel",
        referenceValues: { related_npcs: npcB.slug },
      }),
    );

    expect(result?.slug).toBe(location.slug);
    const links = await sql<{ target_id: number }[]>`
      SELECT target_id FROM archive_links WHERE source_id = ${location.id}
    `;
    expect(links.map((l) => l.target_id)).toEqual([npcB.id]);
  });

  it("returns null and changes nothing when the requester is not the owner", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const entry = await createArchiveEntry(
      baseEntryInput({ ownerUserId: owner.id, title: "Ursprünglicher Titel" }),
    );

    const result = await updateOwnArchiveEntryContent(
      intruder.id,
      entry.id,
      baseEntryInput({ title: "Gehackter Titel" }),
    );

    expect(result).toBeNull();
    const [row] = await sql<{ title: string }[]>`
      SELECT title FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.title).toBe("Ursprünglicher Titel");
  });
});

describe("setArchiveEntryDraft", () => {
  it("lets the owner pull a published entry back to a draft", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: user.id }));

    const result = await setArchiveEntryDraft(user.id, entry.id, true);

    expect(result?.slug).toBe(entry.slug);
    const [row] = await sql<{ is_draft: boolean }[]>`
      SELECT is_draft FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.is_draft).toBe(true);
  });

  it("lets the owner publish a draft straight from the list", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id, isDraft: true }),
    );

    await setArchiveEntryDraft(user.id, entry.id, false);

    const [row] = await sql<{ is_draft: boolean }[]>`
      SELECT is_draft FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.is_draft).toBe(false);
  });

  it("does not let a non-owner change the state", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: owner.id }));

    const result = await setArchiveEntryDraft(intruder.id, entry.id, true);

    expect(result).toBeNull();
  });
});

describe("setArchiveEntryOwner", () => {
  it("reassigns the owner of a regular archive entry", async () => {
    const owner = await insertUser();
    const newOwner = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: owner.id }));

    const result = await setArchiveEntryOwner(entry.id, newOwner.id);

    expect(result?.slug).toBe(entry.slug);
    const [row] = await sql<{ owner_user_id: number }[]>`
      SELECT owner_user_id FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.owner_user_id).toBe(newOwner.id);
  });

  // Dialoge (category 'dialogue') waren hier bisher ausgeschlossen — die
  // Owner-Zuweisung schlug mit "Eintrag nicht gefunden" fehl, siehe
  // ActionsMenu.tsx-Fix. Owner-Wechsel darf dabei metadata.participants
  // nicht anfassen.
  it("reassigns the owner of a dialogue without touching participants", async () => {
    const ownUser = await insertUser();
    const partnerUser = await insertUser();
    const newOwner = await insertUser();
    const ownChar = await insertCharacter({ playerId: ownUser.id, name: "Own" });
    const partnerChar = await insertCharacter({ playerId: partnerUser.id, name: "Partner" });

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

    const result = await setArchiveEntryOwner(entry.id, newOwner.id);

    expect(result?.slug).toBe(dialogue.slug);
    const [row] = await sql<{ owner_user_id: number; metadata: { participants: unknown[] } }[]>`
      SELECT owner_user_id, metadata FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.owner_user_id).toBe(newOwner.id);
    expect(row.metadata.participants).toHaveLength(2);
  });
});

describe("getOwnArchiveEntryForEdit", () => {
  it("round-trips reference field slugs from archive_links", async () => {
    const user = await insertUser();
    const npc = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id, title: "Referenzierter NPC", category: "npc" }),
    );
    const location = await createArchiveEntry(
      baseEntryInput({
        ownerUserId: user.id,
        referenceValues: { related_npcs: npc.slug },
      }),
    );

    const result = await getOwnArchiveEntryForEdit(user.id, location.id);

    expect(result?.referenceValues.related_npcs).toBe(npc.slug);
  });

  it("returns null for a non-owner", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: owner.id }));

    const result = await getOwnArchiveEntryForEdit(intruder.id, entry.id);

    expect(result).toBeNull();
  });
});

// Der Bearbeiten-Stift auf der Leseseite führt seit v1.34 in den vollen
// Editor — auch für Spielleitung/Administration auf einem fremden Eintrag.
// Dessen Abfragen heben den Owner-Scope dafür auf (asModerator); das Recht
// content.moderate prüfen Seite und Action davor.
describe("Moderation fremder Einträge", () => {
  it("lädt einen fremden Eintrag nur mit asModerator zum Bearbeiten", async () => {
    const owner = await insertUser();
    const moderator = await insertUser();
    const entry = await createArchiveEntry(
      baseEntryInput({ ownerUserId: owner.id, title: "Fremder Eintrag" }),
    );

    expect(await getOwnArchiveEntryForEdit(moderator.id, entry.id)).toBeNull();
    const asModerator = await getOwnArchiveEntryForEdit(
      moderator.id,
      entry.id,
      true,
    );
    expect(asModerator?.title).toBe("Fremder Eintrag");
  });

  it("speichert einen fremden Eintrag nur mit asModerator", async () => {
    const owner = await insertUser();
    const moderator = await insertUser();
    const entry = await createArchiveEntry(
      baseEntryInput({ ownerUserId: owner.id, title: "Vorher" }),
    );

    expect(
      await updateOwnArchiveEntryContent(
        moderator.id,
        entry.id,
        baseEntryInput({ title: "Ohne Recht" }),
      ),
    ).toBeNull();

    const result = await updateOwnArchiveEntryContent(
      moderator.id,
      entry.id,
      baseEntryInput({ title: "Nachher" }),
      true,
    );
    expect(result?.slug).toBe(entry.slug);

    const [row] = await sql<{ title: string; owner_user_id: number }[]>`
      SELECT title, owner_user_id FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.title).toBe("Nachher");
    // Die Moderation ändert den Inhalt, nicht die Eigentümerschaft.
    expect(row.owner_user_id).toBe(owner.id);
  });
});

// Die eine Sichtbarkeitsachse seit v1.34: veröffentlicht oder Entwurf. Was
// früher „gm" oder „privat" war, ist mit der Migration veröffentlicht — es gibt
// keine Abfrage mehr, die daran noch filtern könnte.
describe("getNpcOptions — veröffentlicht oder Entwurf", () => {
  it("bietet jeden veröffentlichten NPC an, auch anonym", async () => {
    const npc = await insertNpcEntry({ title: "Wirtin Sareth" });

    const options = await getNpcOptions();
    const found = options.find((o) => o.id === npc.id);

    expect(found).toMatchObject({ isDraft: false });
    expect(canView(found!.isDraft, found!.ownerUserId, null)).toBe(true);
  });

  it("führt einen NPC-Entwurf mit, überlässt das Filtern aber canView", async () => {
    // Die Abfrage filtert bewusst nicht selbst (siehe getNpcOptions) — sonst
    // sähe die Owner-Person ihren eigenen Entwurf nicht.
    const draft = await insertNpcEntry({ title: "Halbfertig", isDraft: true });

    const options = await getNpcOptions();
    const found = options.find((o) => o.id === draft.id);

    expect(found?.isDraft).toBe(true);
    expect(canView(found!.isDraft, found!.ownerUserId, null)).toBe(false);
  });
});

// Aliase: wie bei Charakteren weitere Namen desselben Eintrags. Sie liegen in
// metadata und müssen den Weg Anlegen → Bearbeiten-Formular → Speichern
// unverändert überstehen.
describe("Aliase eines Datenbank-Eintrags", () => {
  it("speichert sie beim Anlegen und gibt sie zum Bearbeiten zurück", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry(
      baseEntryInput({
        ownerUserId: user.id,
        title: "Deep Space 12",
        aliases: ["DS12", "Terok Nor II"],
      }),
    );

    const [row] = await sql<{ metadata: { aliases?: string[] } }[]>`
      SELECT metadata FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.metadata.aliases).toEqual(["DS12", "Terok Nor II"]);

    const forEdit = await getOwnArchiveEntryForEdit(user.id, entry.id);
    expect(forEdit?.aliases).toEqual(["DS12", "Terok Nor II"]);
  });

  it("ersetzt sie beim Speichern der Bearbeitung", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id, aliases: ["Alt"] }),
    );

    await updateOwnArchiveEntryContent(
      user.id,
      entry.id,
      baseEntryInput({ aliases: ["Neu", "Neuer"] }),
    );

    const forEdit = await getOwnArchiveEntryForEdit(user.id, entry.id);
    expect(forEdit?.aliases).toEqual(["Neu", "Neuer"]);
  });

  it("ist ohne Angabe eine leere Liste — nie undefined", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: user.id }));

    const forEdit = await getOwnArchiveEntryForEdit(user.id, entry.id);
    expect(forEdit?.aliases).toEqual([]);
  });
});
