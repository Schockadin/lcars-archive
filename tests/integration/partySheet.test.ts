import { describe, it, expect, vi } from "vitest";
import sql from "@/lib/db";
import { getPartySheet } from "@/lib/partySheet";
import { insertUser, insertCharacter } from "./helpers";

vi.mock("next/cache", () => ({
  cacheTag: () => {},
  cacheLife: () => {},
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

// Das Gruppenblatt zeigt genau die Charaktere, die am Tisch sitzen.

async function setStats(id: number, stats: Record<string, unknown>) {
  const payload = { stats } as unknown as Parameters<typeof sql.json>[0];
  await sql`
    UPDATE characters
    SET metadata = metadata || ${sql.json(payload)}
    WHERE id = ${id}
  `;
}

describe("getPartySheet", () => {
  it("nimmt nur zugewiesene, aktive Charaktere", async () => {
    const user = await insertUser();
    await insertCharacter({ name: "Spielfigur", playerId: user.id });
    // Ein NPC hat kein Konto.
    await insertCharacter({ name: "NPC ohne Konto" });

    const party = await getPartySheet();
    expect(party.map((m) => m.name)).toEqual(["Spielfigur"]);
    expect(party[0].playerName).toBe(user.name);
  });

  it("übergeht Entwürfe und zurückgezogene Akten", async () => {
    const user = await insertUser();
    const entwurf = await insertCharacter({ name: "Entwurf", playerId: user.id });
    const inaktiv = await insertCharacter({ name: "Inaktiv", playerId: user.id });
    await sql`UPDATE characters SET is_draft = true WHERE id = ${entwurf.id}`;
    await sql`UPDATE characters SET status = 'retired' WHERE id = ${inaktiv.id}`;

    expect(await getPartySheet()).toHaveLength(0);
  });

  it("rechnet den maximalen Stress aus Fitness und Talent-Bonus", async () => {
    const user = await insertUser();
    const figur = await insertCharacter({ name: "Kira", playerId: user.id });
    await setStats(figur.id, {
      attributes: { control: 9, daring: 10, fitness: 11, insight: 8, presence: 9, reason: 7 },
      departments: { command: 3, conn: 1, engineering: 2, security: 4, medicine: 1, science: 2 },
      stressBonus: 3,
      resistance: 2,
      determination: 1,
      talents: ["Eigener Name (Studious)"],
      focuses: ["Taktik"],
      values: ["Zuerst die Crew"],
    });

    const [member] = await getPartySheet();
    expect(member.stats.attributes.fitness).toBe(11);
    expect(member.stats.departments.security).toBe(4);
    // Fitness 11 + Bonus 3.
    expect(member.maxStress).toBe(14);
    expect(member.stats.resistance).toBe(2);
    // Ein umbenanntes Talent erscheint so, wie es auch auf dem Bogen steht:
    // eigener Name samt Katalog-Original in Klammern (parseTalentEntry gibt
    // als `name` den vollen Anzeigetext zurück, als `original` nur „Studious").
    expect(member.talents).toEqual(["Eigener Name (Studious)"]);
    expect(member.focuses).toEqual(["Taktik"]);
  });

  it("kommt mit einer leeren Akte zurecht", async () => {
    // Ein frisch angelegter Charakter hat noch keine Werte — die Tabelle darf
    // daran nicht scheitern, sie zeigt Striche.
    const user = await insertUser();
    await insertCharacter({ name: "Neu", playerId: user.id });

    const [member] = await getPartySheet();
    expect(member.stats.attributes.fitness).toBeNull();
    expect(member.maxStress).toBeNull();
    expect(member.talents).toEqual([]);
  });
});
