import { describe, it, expect, vi } from "vitest";

// getCharacterCreationStates ist eine "use cache"-Funktion (cacheTag/
// cacheLife) — beides gibt es außerhalb von Next nicht. Gleiches Vorgehen wie
// in gameSessions.test.ts: next/cache stubben, die Abfrage selbst läuft dann
// uncacht gegen die Testdatenbank.
vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

import sql from "@/lib/db";
import {
  getAllCharactersForAdmin,
  getCharacterCreationStates,
} from "@/lib/characters";
import { insertCharacter, insertUser } from "./helpers";

// Ein JSON-taugliches Objekt: sql.json() nimmt kein Record<string, unknown>
// (das schlösse Funktionen und Date mit ein), die Werte hier sind aber reines
// JSON aus der metadata-Spalte.
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
interface JsonObject {
  [key: string]: JsonValue;
}

async function setStats(id: number, stats: JsonObject) {
  await sql`
    UPDATE characters
    SET metadata = ${sql.json({ stats })}
    WHERE id = ${id}
  `;
}

// Der Erschaffungs-Stand für /gm/characters. Er darf NICHT aus den
// Charakterzeilen der Verwaltung kommen: die haben metadata.stats abgestreift
// (parseCharacter), womit die Seite jeden Bogen als „in Erschaffung" zeigte.
describe("getCharacterCreationStates", () => {
  it("meldet eine abgeschlossene Erschaffung als abgeschlossen", async () => {
    const fertig = await insertCharacter({ name: "Fertig" });
    const offen = await insertCharacter({ name: "Offen" });
    await setStats(fertig.id, { creationLocked: true });
    await setStats(offen.id, { creationLocked: false });

    const states = await getCharacterCreationStates();
    const byId = new Map(states.map((s) => [s.id, s]));

    expect(byId.get(fertig.id)?.creationLocked).toBe(true);
    expect(byId.get(offen.id)?.creationLocked).toBe(false);
  });

  it("liest den Stand, den getAllCharactersForAdmin nicht mehr hergibt", async () => {
    // Die Gegenprobe zur Ursache: dieselbe Figur, einmal über die Zeilen der
    // Verwaltung (stats abgestreift) und einmal über diese Abfrage.
    const character = await insertCharacter({ name: "Abgeschlossen" });
    await setStats(character.id, { creationLocked: true });

    const admin = await getAllCharactersForAdmin();
    expect(
      admin.find((c) => c.id === character.id)?.metadata.stats,
    ).toBeUndefined();

    const states = await getCharacterCreationStates();
    expect(states.find((s) => s.id === character.id)?.creationLocked).toBe(
      true,
    );
  });

  it("reicht notierte Steigerungen und den Spieler mit heraus", async () => {
    const user = await insertUser();
    const character = await insertCharacter({
      name: "Mit Notiz",
      playerId: user.id,
    });
    await setStats(character.id, {
      creationLocked: true,
      pendingAdvancements: [
        { kind: "attribute", key: "control", label: "Kontrolle +1", cost: 4 },
      ],
    });

    const state = (await getCharacterCreationStates()).find(
      (s) => s.id === character.id,
    );

    expect(state?.playerId).toBe(user.id);
    expect(state?.pending.map((p) => p.label)).toEqual(["Kontrolle +1"]);
  });

  it("lässt Entwürfe weg — wie die Zuordnung darüber", async () => {
    const draft = await insertCharacter({ name: "Entwurf", isDraft: true });
    await setStats(draft.id, { creationLocked: true });

    const states = await getCharacterCreationStates();
    expect(states.find((s) => s.id === draft.id)).toBeUndefined();
  });
});
