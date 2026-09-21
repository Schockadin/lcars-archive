import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  previewMarkdownImportAction,
  confirmMarkdownImportAction,
} from "@/app/_shared/import/actions";
import type {
  ArchiveImportEdits,
  CharacterImportEdits,
  MissionImportEdits,
  MissionLogImportEdits,
} from "@/lib/markdownImport";
import { insertUser, insertCharacter, insertMission } from "./helpers";

// Gleiches Muster wie dashboardSettings.test.ts: cookies() per In-Memory-
// Store, damit createSession() und die Prüfungen in den Actions im echten
// Zusammenspiel laufen — genau die sind hier der Prüfgegenstand.
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

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: <T,>(fn: T) => fn,
}));

beforeEach(async () => {
  cookieStore.clear();
  // resetDb() (setup.ts) truncatet die roles-Tabelle NICHT, und
  // roles.test.ts lässt dort eigene Zeilen liegen. Leer heißt für
  // getRoleMap() „nur die eingebauten Presets" — genau die Rechte, mit denen
  // die Erwartungen hier rechnen.
  await sql`DELETE FROM roles`;
});

async function login(role: string) {
  const user = await insertUser({ role });
  await createSession({
    id: user.id,
    email: user.email,
    role: role as "player",
    session_version: 0,
  });
  return user;
}

function md(fm: Record<string, string>, body: string): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

const ARCHIVE_MD = md(
  { type: "archive", slug: "importierter-npc", title: "Ein NPC", category: "npc" },
  "Inhalt.",
);

function archiveEdits(
  overrides: Partial<ArchiveImportEdits> = {},
): ArchiveImportEdits {
  return {
    slug: "importierter-npc",
    title: "Ein NPC",
    tags: [],
    summary: null,
    bodyMarkdown: "Inhalt.",
    ownerSlug: null,
    attributeValues: {},
    referenceValues: {},
    ...overrides,
  };
}

const CHARACTER_MD = md(
  { type: "character", slug: "importierte-figur", name: "Importierte Figur" },
  "Biografie.",
);

function characterEdits(
  overrides: Partial<CharacterImportEdits> = {},
): CharacterImportEdits {
  return {
    slug: "importierte-figur",
    name: "Importierte Figur",
    status: "active",
    bodyMarkdown: "Biografie.",
    portrait: null,
    rank: null,
    species: [],
    homeworld: null,
    age: null,
    affiliationFactions: [],
    affiliationShips: [],
    affiliationDivision: null,
    player: null,
    aliases: [],
    generation: [],
    tags: [],
    ownerSlug: null,
    ...overrides,
  };
}

const MISSION_MD = md(
  { type: "mission", slug: "importierte-mission", title: "Importierte Mission" },
  "Beschreibung.",
);

function missionEdits(
  overrides: Partial<MissionImportEdits> = {},
): MissionImportEdits {
  return {
    slug: "importierte-mission",
    title: "Importierte Mission",
    status: "active",
    startedAt: null,
    endedAt: null,
    tags: [],
    bodyMarkdown: "Beschreibung.",
    ownerSlug: null,
    ...overrides,
  };
}

const LOG_MD = md({ type: "mission-log", title: "Ein Logeintrag" }, "Logtext.");

function logEdits(
  missionSlug: string,
  authorSlug: string,
  overrides: Partial<MissionLogImportEdits> = {},
): MissionLogImportEdits {
  return {
    title: "Ein Logeintrag",
    missionSlug,
    authorSlug,
    logDate: null,
    sessionNr: 1,
    tags: [],
    bodyMarkdown: "Logtext.",
    ownerSlug: null,
    ...overrides,
  };
}

// ── Wer welche Art überhaupt hochladen darf ────────────────────────────────
//
// Die Matrix selbst ist in src/lib/importAccess.test.ts festgenagelt; hier
// geht es darum, dass die Actions sie auch anwenden — vorher galt für beide
// schlicht requireAdmin().
describe("Import-Schranke je Inhaltsart", () => {
  it("lässt ein Gast-Konto einen Datenbank-Eintrag anlegen", async () => {
    await login("guest");

    const result = await confirmMarkdownImportAction(
      "archive",
      "npc.md",
      ARCHIVE_MD,
      archiveEdits(),
    );
    expect(result.ok).toBe(true);
  });

  it("lässt ein Gast-Konto keinen Charakter anlegen", async () => {
    await login("guest");

    const result = await confirmMarkdownImportAction(
      "character",
      "c.md",
      CHARACTER_MD,
      characterEdits(),
    );
    expect(result).toEqual({
      ok: false,
      error: "Für diese Inhaltsart fehlt dir die Berechtigung.",
    });
    const [row] = await sql<{ n: string }[]>`SELECT count(*) AS n FROM characters`;
    expect(row.n).toBe("0");
  });

  it("lässt einen Spieler keine Mission anlegen, die Spielleitung schon", async () => {
    await login("player");
    const verweigert = await confirmMarkdownImportAction(
      "mission",
      "m.md",
      MISSION_MD,
      missionEdits(),
    );
    expect(verweigert.ok).toBe(false);

    await login("gm");
    const erlaubt = await confirmMarkdownImportAction(
      "mission",
      "m.md",
      MISSION_MD,
      missionEdits(),
    );
    expect(erlaubt.ok).toBe(true);
  });

  // Die Vorschau schreibt zwar nichts, liest aber sehr wohl — und stünde
  // sonst als Parser für Inhalte offen, die diese Person gar nicht anlegen
  // darf. Statt zu werfen kommt die Meldung je Datei zurück, damit sie in
  // der Oberfläche dort landet, wo sonst die Vorschau stünde.
  it("gibt auch die Vorschau nur frei, was erlaubt ist", async () => {
    await login("guest");

    const [vorschau] = await previewMarkdownImportAction("character", [
      { filename: "c.md", content: CHARACTER_MD },
    ]);
    expect(vorschau).toEqual({
      ok: false,
      filename: "c.md",
      error: "Für diese Inhaltsart fehlt dir die Berechtigung.",
    });
  });
});

// ── Der erzwungene Eigentümer ──────────────────────────────────────────────
//
// markdownImport.ts übernimmt ownerSlug ungeprüft (siehe dortiger
// Kopfkommentar). Solange nur die Administration die Actions erreichte, war
// das unbedenklich; seit sie jeder erreicht, fangen die Actions es ab.
describe("Eigentümer", () => {
  it("setzt den Eigentümer eines Eintrags auf den Aufrufer", async () => {
    const fremd = await insertUser({ slug: "fremde-person" });
    const ich = await login("player");

    const result = await confirmMarkdownImportAction(
      "archive",
      "npc.md",
      ARCHIVE_MD,
      // Genau der Angriff: ein fremder Slug im Formularfeld.
      archiveEdits({ ownerSlug: fremd.slug }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ owner_user_id: number | null }[]>`
      SELECT owner_user_id FROM archive_entries WHERE id = ${result.id}
    `;
    expect(row.owner_user_id).toBe(ich.id);
  });

  it("macht den Aufrufer zum Spieler einer importierten Figur", async () => {
    const fremd = await insertUser({ slug: "fremde-person-2" });
    const ich = await login("player");

    const result = await confirmMarkdownImportAction(
      "character",
      "c.md",
      CHARACTER_MD,
      characterEdits({ ownerSlug: fremd.slug }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ player_id: number | null }[]>`
      SELECT player_id FROM characters WHERE id = ${result.id}
    `;
    // Nicht nur „nicht fremd", sondern tatsächlich meine Figur: Ohne
    // player_id stünde sie in keiner Auswahlliste und wäre für niemanden zu
    // bearbeiten.
    expect(row.player_id).toBe(ich.id);
  });

  // Der Umzug fremder Inhalte aus dem Vault ist der Zweck von
  // /admin/import — dort bleibt das Feld also wirksam.
  it("lässt der Administration den fremden Eigentümer", async () => {
    const fremd = await insertUser({ slug: "fremde-person-3" });
    await login("admin");

    const result = await confirmMarkdownImportAction(
      "archive",
      "npc.md",
      ARCHIVE_MD,
      archiveEdits({ ownerSlug: fremd.slug }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ owner_user_id: number | null }[]>`
      SELECT owner_user_id FROM archive_entries WHERE id = ${result.id}
    `;
    expect(row.owner_user_id).toBe(fremd.id);
  });
});

// ── Die Autoren-Figur eines Logbuchs ───────────────────────────────────────
describe("Missionslog", () => {
  it("nimmt eine eigene, veröffentlichte Figur an", async () => {
    const ich = await login("player");
    const mission = await insertMission();
    const figur = await insertCharacter({ playerId: ich.id });

    const result = await confirmMarkdownImportAction(
      "mission_log",
      "log.md",
      LOG_MD,
      logEdits(mission.slug, figur.slug),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await sql<{ author_id: number; owner_user_id: number | null }[]>`
      SELECT author_id, owner_user_id FROM mission_logs WHERE id = ${result.id}
    `;
    expect(row.author_id).toBe(figur.id);
    expect(row.owner_user_id).toBe(ich.id);
  });

  it("lehnt eine fremde Figur ab", async () => {
    const andere = await insertUser({ slug: "andere-person" });
    await login("player");
    const mission = await insertMission();
    const fremdeFigur = await insertCharacter({ playerId: andere.id });

    const result = await confirmMarkdownImportAction(
      "mission_log",
      "log.md",
      LOG_MD,
      logEdits(mission.slug, fremdeFigur.slug),
    );
    expect(result.ok).toBe(false);
    const [row] = await sql<{ n: string }[]>`SELECT count(*) AS n FROM mission_logs`;
    expect(row.n).toBe("0");
  });

  // Ein Entwurf ist für niemanden außer seinem Besitzer sichtbar und steht
  // auch im normalen Logbuch-Formular nicht zur Wahl.
  it("lehnt eine eigene Figur ab, die noch Entwurf ist", async () => {
    const ich = await login("player");
    const mission = await insertMission();
    const entwurf = await insertCharacter({ playerId: ich.id, isDraft: true });

    const result = await confirmMarkdownImportAction(
      "mission_log",
      "log.md",
      LOG_MD,
      logEdits(mission.slug, entwurf.slug),
    );
    expect(result.ok).toBe(false);
  });

  // Gegenprobe zur Schranke oben: Für die Administration ist der Import der
  // Weg, fremde Logbücher einzupflegen — dort gilt die Figuren-Bindung nicht.
  it("lässt die Administration eine fremde Figur schreiben", async () => {
    const andere = await insertUser({ slug: "andere-person-2" });
    await login("admin");
    const mission = await insertMission();
    const fremdeFigur = await insertCharacter({ playerId: andere.id });

    const result = await confirmMarkdownImportAction(
      "mission_log",
      "log.md",
      LOG_MD,
      logEdits(mission.slug, fremdeFigur.slug),
    );
    expect(result.ok).toBe(true);
  });
});
