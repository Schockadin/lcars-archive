import { describe, it, expect, vi, beforeEach } from "vitest";
import sql from "@/lib/db";
import { createSession } from "@/lib/session";
import { updateDashboardSettingsAction } from "@/app/user/dashboardSettingsActions";
import {
  DASHBOARD_SECTIONS,
  dashboardCharacterVisible,
  dashboardSectionEnabled,
  sanitizeDashboardPrefs,
} from "@/lib/dashboardSections";
import { insertCharacter, insertUser } from "./helpers";

// Gleiches Muster wie contentTools.test.ts: cookies() per In-Memory-Store,
// damit createSession() und verifySession() in der Action im echten
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

async function login() {
  const user = await insertUser({ role: "player" });
  await createSession({
    id: user.id,
    email: user.email,
    role: "player",
    session_version: 0,
  });
  return user;
}

// Das Formular schickt zu jeder Sektion ein verstecktes knownSections-Feld
// mit; ohne das ließe sich nichts abwählen (siehe dashboardSettingsActions).
function formular(input: {
  sections: string[];
  characters?: number[];
  knownCharacters?: number[];
  knownSections?: string[];
}): FormData {
  const data = new FormData();
  for (const id of input.knownSections ?? DASHBOARD_SECTIONS.map((s) => s.id)) {
    data.append("knownSections", id);
  }
  for (const id of input.sections) data.append("sections", id);
  for (const id of input.knownCharacters ?? []) {
    data.append("knownCharacters", String(id));
  }
  for (const id of input.characters ?? []) {
    data.append("characters", String(id));
  }
  return data;
}

async function gespeicherteVorlieben(userId: number) {
  const [row] = await sql<{ dashboard_prefs: unknown }[]>`
    SELECT dashboard_prefs FROM users WHERE id = ${userId}
  `;
  return sanitizeDashboardPrefs(row?.dashboard_prefs);
}

describe("updateDashboardSettingsAction", () => {
  it("legt ein frisches Konto ohne gespeicherte Abweichung an", async () => {
    const user = await login();

    const prefs = await gespeicherteVorlieben(user.id);

    expect(prefs.sections).toEqual({});
    // Was der User sieht, sind damit genau die Vorgaben.
    expect(dashboardSectionEnabled(prefs, "news")).toBe(true);
    expect(dashboardSectionEnabled(prefs, "versionen")).toBe(false);
  });

  it("speichert beide Richtungen der Abweichung", async () => {
    const user = await login();

    const result = await updateDashboardSettingsAction(
      {},
      // news (Vorgabe an) abgewählt, versionen (Vorgabe aus) angehakt.
      formular({
        sections: DASHBOARD_SECTIONS.filter(
          (s) => (s.default && s.id !== "news") || s.id === "versionen",
        ).map((s) => s.id),
      }),
    );

    expect(result.success).toBe(true);
    const prefs = await gespeicherteVorlieben(user.id);
    expect(prefs.sections).toEqual({ news: false, versionen: true });
  });

  it("schreibt nichts in die Spalte, was ohnehin der Vorgabe entspricht", async () => {
    const user = await login();

    await updateDashboardSettingsAction(
      {},
      formular({
        sections: DASHBOARD_SECTIONS.filter((s) => s.default).map((s) => s.id),
      }),
    );

    // Der Punkt der Sparsamkeit: Eine später geänderte Vorgabe erreicht so
    // auch die, die einmal auf „Speichern" gedrückt haben, ohne etwas
    // anzufassen.
    const [row] = await sql<{ dashboard_prefs: { sections: unknown } }[]>`
      SELECT dashboard_prefs FROM users WHERE id = ${user.id}
    `;
    expect(row.dashboard_prefs.sections).toEqual({});
  });

  it("blendet genau die abgewählten Charaktere aus", async () => {
    const user = await login();
    const behalten = await insertCharacter({
      name: "T'Vel",
      slug: "t-vel",
      playerId: user.id,
    });
    const weg = await insertCharacter({
      name: "Rina Dax",
      slug: "rina-dax",
      playerId: user.id,
    });

    await updateDashboardSettingsAction(
      {},
      formular({
        sections: ["charaktere"],
        knownCharacters: [behalten.id, weg.id],
        characters: [behalten.id],
      }),
    );

    const prefs = await gespeicherteVorlieben(user.id);
    expect(dashboardCharacterVisible(prefs, behalten.id)).toBe(true);
    expect(dashboardCharacterVisible(prefs, weg.id)).toBe(false);
  });

  // Der Fall „Tab lag offen, inzwischen ein Charakter mehr": Die neue Figur
  // stand im abgeschickten Formular nirgends — weder als Häkchen noch als
  // knownCharacters. Sie darf davon nicht still verschwinden.
  it("lässt einen Charakter in Ruhe, den das Formular nicht kannte", async () => {
    const user = await login();
    const alt = await insertCharacter({
      name: "T'Vel",
      slug: "t-vel",
      playerId: user.id,
    });
    const neu = await insertCharacter({
      name: "Rina Dax",
      slug: "rina-dax",
      playerId: user.id,
    });

    await updateDashboardSettingsAction(
      {},
      formular({
        sections: ["charaktere"],
        knownCharacters: [alt.id],
        characters: [alt.id],
      }),
    );

    const prefs = await gespeicherteVorlieben(user.id);
    expect(dashboardCharacterVisible(prefs, neu.id)).toBe(true);
  });

  // Umgekehrt: Ein bereits abgewählter Charakter, den das Formular nicht
  // kannte, bleibt abgewählt statt wieder aufzutauchen.
  it("behält einen abgewählten Charakter, den das Formular nicht kannte", async () => {
    const user = await login();
    const sichtbar = await insertCharacter({
      name: "T'Vel",
      slug: "t-vel",
      playerId: user.id,
    });
    const versteckt = await insertCharacter({
      name: "Rina Dax",
      slug: "rina-dax",
      playerId: user.id,
    });

    await updateDashboardSettingsAction(
      {},
      formular({
        sections: ["charaktere"],
        knownCharacters: [sichtbar.id, versteckt.id],
        characters: [sichtbar.id],
      }),
    );
    // Zweiter Durchgang aus einem Formular, das nur noch den einen kennt.
    await updateDashboardSettingsAction(
      {},
      formular({
        sections: ["charaktere"],
        knownCharacters: [sichtbar.id],
        characters: [sichtbar.id],
      }),
    );

    const prefs = await gespeicherteVorlieben(user.id);
    expect(dashboardCharacterVisible(prefs, versteckt.id)).toBe(false);
  });

  // Die ids kommen aus dem Formular, also vom Client. Eine fremde Figur darf
  // in den eigenen Vorlieben nichts verloren haben.
  it("nimmt keine fremde Charakter-id auf", async () => {
    const user = await login();
    const fremder = await insertUser({ role: "player" });
    const fremd = await insertCharacter({
      name: "Fremdfigur",
      slug: "fremdfigur",
      playerId: fremder.id,
    });

    await updateDashboardSettingsAction(
      {},
      formular({
        sections: ["charaktere"],
        knownCharacters: [fremd.id],
        characters: [],
      }),
    );

    const prefs = await gespeicherteVorlieben(user.id);
    expect(prefs.hiddenCharacters).toEqual([]);
  });
});
