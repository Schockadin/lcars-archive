import { redirect } from "next/navigation";

// /user/characters/[id] hat keinen eigenen Inhalt — der Charakterbogen ist die
// Ansicht, mit der man hier anfängt; auf die Stammdaten führt der Umschalter
// darüber (siehe CharacterTabs).
export default async function OwnCharacterPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  redirect(`/user/characters/${characterId}/stats`);
}
