import { describe, it, expect } from "vitest";
import sql from "@/lib/db";
import {
  createArchiveEntry,
  updateOwnArchiveEntryContent,
  setArchiveEntryVisibility,
  getOwnArchiveEntryForEdit,
  setArchiveEntryOwner,
} from "@/lib/archive";
import { createDialogue } from "@/lib/dialoguesCore";
import { insertUser, insertCharacter } from "./helpers";

function baseEntryInput(
  overrides: Partial<Parameters<typeof createArchiveEntry>[0]> = {},
) {
  return {
    title: "Deep Space 12",
    category: "location" as const,
    tags: [],
    summary: null,
    attributeValues: {},
    referenceValues: {},
    bodyMarkdown: "",
    ownerUserId: 0,
    isDraft: false,
    ...overrides,
  };
}

describe("createArchiveEntry", () => {
  it("creates an entry owned by the given user with public default visibility", async () => {
    const user = await insertUser();

    const result = await createArchiveEntry(
      baseEntryInput({ ownerUserId: user.id }),
    );

    const [row] = await sql<{ owner_user_id: number; visibility: string }[]>`
      SELECT owner_user_id, visibility FROM archive_entries WHERE id = ${result.id}
    `;
    expect(row.owner_user_id).toBe(user.id);
    expect(row.visibility).toBe("public");
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

describe("setArchiveEntryVisibility", () => {
  it("lets the owner change visibility", async () => {
    const user = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: user.id }));

    const result = await setArchiveEntryVisibility(user.id, entry.id, "private");

    expect(result?.slug).toBe(entry.slug);
    const [row] = await sql<{ visibility: string }[]>`
      SELECT visibility FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.visibility).toBe("private");
  });

  it("does not let a non-owner change visibility", async () => {
    const owner = await insertUser();
    const intruder = await insertUser();
    const entry = await createArchiveEntry(baseEntryInput({ ownerUserId: owner.id }));

    const result = await setArchiveEntryVisibility(intruder.id, entry.id, "private");

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
