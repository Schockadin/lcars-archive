import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  applyAutolinkAction,
  hasAutolinkMatchesAction,
  previewAutolinkAction,
  applyWikilinkCleanupAction,
  previewWikilinkCleanupAction,
} from "@/app/actions/contentTools";
import { createArchiveEntry } from "@/lib/archive";
import { insertCharacter, insertUser } from "./helpers";

// Gleiches Muster wie adminEditActions.test.ts: cookies() per In-Memory-Store,
// damit createSession() und die Rechteprüfung der Aktionen im echten
// Zusammenspiel laufen.
const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
  headers: vi.fn(async () => new Headers()),
}));

// Die Aktionen revalidieren nach dem Speichern — außerhalb eines echten
// Next-Requests gibt es dafür keinen Kontext (gleiches Muster wie in
// characterWorkflow.test.ts).
vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T,>(fn: T) => fn,
}));

beforeEach(() => {
  cookieStore.clear();
});

async function login(role: string) {
  const user = await insertUser({ role });
  await createSession({
    id: user.id,
    email: user.email,
    role: role as Parameters<typeof createSession>[0]["role"],
    session_version: 0,
  });
  return user;
}

// Ein Eintrag mit einem verlinkbaren Namen im Text und einem Ziel dazu.
async function entryMentioning(ownerId: number) {
  await insertCharacter({ name: "Tuvok" });
  return createArchiveEntry({
    title: "Bericht über Deneb",
    category: "other",
    tags: [],
    summary: null,
    aliases: [],
    attributeValues: {},
    referenceValues: {},
    bodyMarkdown: "Tuvok war dabei.",
    ownerUserId: ownerId,
    isDraft: false,
  });
}

describe("Content-Werkzeuge: wer darf sie anwenden", () => {
  it("lässt den Owner seinen eigenen Inhalt verlinken", async () => {
    const owner = await login("player");
    const entry = await entryMentioning(owner.id);

    expect(await hasAutolinkMatchesAction("archiveEntry", entry.slug)).toBe(true);

    const preview = await previewAutolinkAction("archiveEntry", entry.slug);
    expect("error" in preview).toBe(false);

    const applied = await applyAutolinkAction("archiveEntry", entry.slug);
    expect(applied).toEqual({ matchCount: 1 });

    const [row] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.source_md).toBe("[[Tuvok]] war dabei.");
  });

  it("lässt den Owner die Verlinkung auch wieder entfernen", async () => {
    const owner = await login("player");
    const entry = await entryMentioning(owner.id);
    await applyAutolinkAction("archiveEntry", entry.slug);

    const preview = await previewWikilinkCleanupAction("archiveEntry", entry.slug);
    expect("error" in preview).toBe(false);
    expect(await applyWikilinkCleanupAction("archiveEntry", entry.slug)).toEqual({
      removedCount: 1,
    });
  });

  it("weist eine fremde Person ohne das Recht ab", async () => {
    const owner = await insertUser();
    const entry = await entryMentioning(owner.id);
    await login("player"); // jemand anderes

    expect(await hasAutolinkMatchesAction("archiveEntry", entry.slug)).toBe(false);
    expect(await previewAutolinkAction("archiveEntry", entry.slug)).toHaveProperty(
      "error",
    );
    expect(await applyAutolinkAction("archiveEntry", entry.slug)).toHaveProperty(
      "error",
    );
    expect(
      await previewWikilinkCleanupAction("archiveEntry", entry.slug),
    ).toHaveProperty("error");
    expect(
      await applyWikilinkCleanupAction("archiveEntry", entry.slug),
    ).toHaveProperty("error");

    // Und der Text bleibt, wie er war.
    const [row] = await sql<{ source_md: string }[]>`
      SELECT source_md FROM archive_entries WHERE id = ${entry.id}
    `;
    expect(row.source_md).toBe("Tuvok war dabei.");
  });

  it("lässt content.autolink_tools auch auf fremde Inhalte zu", async () => {
    const owner = await insertUser();
    const entry = await entryMentioning(owner.id);
    await login("gm"); // trägt content.autolink_tools

    expect(await hasAutolinkMatchesAction("archiveEntry", entry.slug)).toBe(true);
    expect(await applyAutolinkAction("archiveEntry", entry.slug)).toEqual({
      matchCount: 1,
    });
  });

  it("weist ab, wer gar nicht angemeldet ist", async () => {
    const owner = await insertUser();
    const entry = await entryMentioning(owner.id);

    expect(await hasAutolinkMatchesAction("archiveEntry", entry.slug)).toBe(false);
    expect(await applyAutolinkAction("archiveEntry", entry.slug)).toHaveProperty(
      "error",
    );
  });

  it("gibt einen Inhalt ohne Owner nur mit dem Recht frei", async () => {
    const entry = await entryMentioning(null as unknown as number);
    await login("player");
    expect(await hasAutolinkMatchesAction("archiveEntry", entry.slug)).toBe(false);

    cookieStore.clear();
    await login("gm");
    expect(await hasAutolinkMatchesAction("archiveEntry", entry.slug)).toBe(true);
  });
});
