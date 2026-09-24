import { verifySession } from "@/lib/dal";
import {
  CharacterArchiveError,
  renderCharacterArchivePdf,
} from "@/lib/characterArchive";
import { slugifyBase } from "@/lib/slug";

function integerValues(formData: FormData, name: string): number[] {
  return formData
    .getAll(name)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);
}

export async function POST(request: Request) {
  const session = await verifySession();
  const formData = await request.formData();
  const characterId = Number(formData.get("characterId"));
  if (!Number.isInteger(characterId)) {
    return new Response("Ungültiger Charakter.", { status: 400 });
  }

  const documentIds = integerValues(formData, "documentIds");
  const logIds = integerValues(formData, "logIds");
  const missionSlugs = formData
    .getAll("missionSlugs")
    .map(String)
    .filter(Boolean);
  if (documentIds.length + logIds.length + missionSlugs.length > 100) {
    return new Response("Zu viele Bestandteile ausgewählt.", { status: 400 });
  }

  try {
    const result = await renderCharacterArchivePdf({
      userId: session.userId,
      characterId,
      includeCharacter: formData.get("includeCharacter") === "1",
      documentIds,
      missionSlugs,
      logIds,
    });
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="charakterarchiv-${slugifyBase(result.characterName)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof CharacterArchiveError) {
      return new Response(error.message, { status: 400 });
    }
    throw error;
  }
}
