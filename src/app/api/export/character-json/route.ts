import { verifySession } from "@/lib/dal";
import { getOwnCharacterForEdit, getOwnCharacterStats } from "@/lib/characters";
import { createCharacterJsonFile } from "@/lib/characterJson";
import { slugifyBase } from "@/lib/slug";

export async function GET(request: Request) {
  const session = await verifySession();
  const url = new URL(request.url);
  const characterId = Number(url.searchParams.get("characterId") ?? "");
  if (!Number.isInteger(characterId) || characterId < 1) {
    return new Response("Ungültiger Charakter.", { status: 400 });
  }

  const [character, sheet] = await Promise.all([
    getOwnCharacterForEdit(session.userId, characterId),
    getOwnCharacterStats(session.userId, characterId),
  ]);
  if (!character || !sheet || character.npcSlug) {
    return new Response("Charakter nicht gefunden oder kein Zugriff.", {
      status: 404,
    });
  }

  const file = createCharacterJsonFile({
    character: {
      name: character.name,
      status: character.status,
      rank: character.rank,
      species: character.species,
      homeworld: character.homeworld,
      aliases: character.aliases,
      age: character.age,
      dateOfBirth: character.dateOfBirth,
      generation: character.generation,
      factions: character.factions,
      ships: character.ships,
      division: character.division,
      tags: character.tags,
      bodyMarkdown: character.sourceMarkdown,
    },
    stats: sheet.stats,
  });

  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="charakter-${slugifyBase(character.name)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
