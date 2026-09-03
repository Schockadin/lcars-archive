import { describe, it, expect, vi, beforeEach } from "vitest";

// Wie adminEditActions.test.ts: cookies() als In-Memory-Store, damit
// createSession()/verifySession() im echten Zusammenspiel laufen. next/cache
// wird zusätzlich gestubbt — die Actions rufen revalidatePath/revalidateTag,
// beides gibt es außerhalb eines Next-Requests nicht, und getAdvancementRules
// ist eine "use cache"-Funktion.
const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name)
        ? { name, value: cookieStore.get(name)! }
        : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T>(fn: T) => fn,
}));

// Mail/Push hängen an externen Diensten — die Actions benachrichtigen nach
// dem Speichern, geprüft wird hier aber das Speichern selbst.
vi.mock("@/lib/follows", () => ({
  notifyContentChange: vi.fn(async () => {}),
}));

import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import { insertUser, redirectedTo, formData } from "./helpers";
import { createCharacterWizardAction } from "@/app/user/characters/_shared/wizardAction";
import {
  updateCharacterHeadAction,
  updateCharacterBioAction,
  saveCharacterStatsAction,
} from "@/app/user/characters/_shared/panelActions";
import { getOwnCharacterStats } from "@/lib/characters";
import { EMPTY_CHARACTER_STATS } from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";

beforeEach(() => {
  cookieStore.clear();
});

async function loginAsPlayer() {
  const user = await insertUser({ role: "player" });
  await createSession({
    id: user.id,
    email: user.email,
    role: "player",
    session_version: 0,
  });
  return user;
}

// Ein vollständiger, regelkonformer Wertesatz (nur ein Attribut auf 12, zwei
// auf 11 — siehe ATTRIBUTE_RULE).
function fullStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  return {
    ...EMPTY_CHARACTER_STATS,
    attributes: {
      control: 10,
      daring: 9,
      fitness: 11,
      insight: 8,
      presence: 9,
      reason: 8,
    },
    departments: {
      command: 2,
      conn: 3,
      engineering: 1,
      security: 4,
      medicine: 1,
      science: 2,
    },
    ...overrides,
  };
}

function wizardForm(
  userId: number,
  stats: CharacterStats,
  extra: Record<string, string> = {},
) {
  return formData({
    userId: String(userId),
    name: "Sh’Ranor th’Zarath",
    status: "active",
    species: "Andorianer",
    rank: "Lieutenant",
    statsJson: JSON.stringify(stats),
    bodyMarkdown: "## Herkunft\n\nGeboren auf Andoria.",
    ...extra,
  });
}

describe("createCharacterWizardAction", () => {
  it("legt Akte, Werte und Biografie in einem Zug an", async () => {
    const user = await loginAsPlayer();

    const url = await redirectedTo(
      createCharacterWizardAction({}, wizardForm(user.id, fullStats())),
    );
    const id = Number(url.split("/").pop());
    expect(Number.isInteger(id)).toBe(true);

    const [row] = await sql<
      {
        name: string;
        player_id: number;
        source_md: string | null;
        metadata: unknown;
      }[]
    >`
      SELECT name, player_id, source_md, metadata FROM characters WHERE id = ${id}
    `;
    expect(row.name).toBe("Sh’Ranor th’Zarath");
    expect(row.player_id).toBe(user.id);
    expect(row.source_md).toContain("Geboren auf Andoria");

    // Die Werte stehen im SELBEN Datensatz — nicht in einem zweiten Schritt
    // nachgereicht.
    const sheet = await getOwnCharacterStats(user.id, id);
    expect(sheet?.stats.attributes.fitness).toBe(11);
    expect(sheet?.stats.departments.security).toBe(4);
    // Die Erschaffung ist danach offen: abgeschlossen wird sie ausdrücklich.
    expect(sheet?.stats.creationLocked).toBe(false);
    // Rang und Spezies kommen aus metadata und stehen damit auf dem Bogen.
    expect(sheet?.rank).toBe("Lieutenant");
    expect(sheet?.species).toBe("Andorianer");
  });

  it("lehnt einen Wertesatz ab, der die Verteilungsregeln verletzt", async () => {
    const user = await loginAsPlayer();

    const stats = fullStats();
    stats.attributes.control = 12;
    stats.attributes.daring = 12;

    const result = await createCharacterWizardAction(
      {},
      wizardForm(user.id, stats),
    );
    expect(result.error).toMatch(/Attribute/);

    const rows = await sql`SELECT id FROM characters`;
    expect(rows).toHaveLength(0);
  });

  it("meldet einen Wert außerhalb des erlaubten Bereichs mit Feldnamen", async () => {
    const user = await loginAsPlayer();

    const result = await createCharacterWizardAction(
      {},
      formData({
        userId: String(user.id),
        name: "Fehlerhaft",
        status: "active",
        statsJson: JSON.stringify({ attributes: { control: 99 } }),
      }),
    );
    expect(result.error).toBe(
      "Kontrolle: bitte eine ganze Zahl zwischen 7 und 12 angeben.",
    );
  });

  it("lehnt mehr Talente ab, als die Ersterschaffung frei hat", async () => {
    const user = await loginAsPlayer();

    const stats = fullStats({
      talents: ["A", "B", "C", "D", "E"],
    });
    const result = await createCharacterWizardAction(
      {},
      wizardForm(user.id, stats),
    );
    expect(result.error).toMatch(/Talent/);
  });

  it("lässt Gast-Accounts keinen Charakter anlegen", async () => {
    const guest = await insertUser({ role: "guest" });
    await createSession({
      id: guest.id,
      email: guest.email,
      role: "guest",
      session_version: 0,
    });

    const result = await createCharacterWizardAction(
      {},
      wizardForm(guest.id, fullStats()),
    );
    expect(result.error).toMatch(/Gast/);
  });
});

describe("Panels der Charakterseite", () => {
  async function setup() {
    const user = await loginAsPlayer();
    const url = await redirectedTo(
      createCharacterWizardAction({}, wizardForm(user.id, fullStats())),
    );
    return { user, id: Number(url.split("/").pop()) };
  }

  it("speichert die Stammdaten, ohne die Biografie zu verlieren", async () => {
    const { user, id } = await setup();

    const result = await updateCharacterHeadAction(
      {},
      formData({
        userId: String(user.id),
        characterId: String(id),
        name: "Sh’Ranor th’Zarath",
        status: "active",
        species: "Andorianer",
        rank: "Commander",
        homeworld: "Andoria",
      }),
    );
    expect(result.success).toBeTruthy();

    const [row] = await sql<
      { source_md: string | null; metadata: { rank: string } }[]
    >`
      SELECT source_md, metadata FROM characters WHERE id = ${id}
    `;
    expect(row.metadata.rank).toBe("Commander");
    // Die Biografie hat ihr eigenes Panel — sie darf hier nicht wegfallen.
    expect(row.source_md).toContain("Geboren auf Andoria");
  });

  it("speichert die Biografie, ohne die Stammdaten zu verlieren", async () => {
    const { user, id } = await setup();

    const result = await updateCharacterBioAction(
      {},
      formData({
        userId: String(user.id),
        characterId: String(id),
        bodyMarkdown: "Ganz neue Biografie.",
      }),
    );
    expect(result.success).toBeTruthy();

    const [row] = await sql<
      { source_md: string; name: string; metadata: { rank: string } }[]
    >`
      SELECT source_md, name, metadata FROM characters WHERE id = ${id}
    `;
    expect(row.source_md).toBe("Ganz neue Biografie.");
    expect(row.name).toBe("Sh’Ranor th’Zarath");
    expect(row.metadata.rank).toBe("Lieutenant");
  });

  it("speichert die Werte und lässt fremde Charaktere unangetastet", async () => {
    const { user, id } = await setup();

    const changed = fullStats({ pronouns: "she/her", values: ["Mut"] });
    const ok = await saveCharacterStatsAction(
      {},
      formData({
        userId: String(user.id),
        characterId: String(id),
        statsJson: JSON.stringify(changed),
      }),
    );
    expect(ok.success).toBeTruthy();
    expect((await getOwnCharacterStats(user.id, id))?.stats.pronouns).toBe(
      "she/her",
    );

    // Ein anderes Konto darf denselben Charakter nicht speichern — die
    // Berechtigung steckt in der owner-gescopten Abfrage.
    const other = await insertUser({ role: "player" });
    await createSession({
      id: other.id,
      email: other.email,
      role: "player",
      session_version: 0,
    });
    const denied = await saveCharacterStatsAction(
      {},
      formData({
        userId: String(other.id),
        characterId: String(id),
        statsJson: JSON.stringify(fullStats({ pronouns: "he/him" })),
      }),
    );
    expect(denied.error).toMatch(/nicht gefunden|Berechtigung/);
    expect((await getOwnCharacterStats(user.id, id))?.stats.pronouns).toBe(
      "she/her",
    );
  });
});
