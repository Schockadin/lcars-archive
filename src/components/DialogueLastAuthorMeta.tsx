export default function DialogueLastAuthorMeta({
  characterName,
}: {
  characterName: string | null;
}) {
  if (!characterName) return null;

  return (
    <span>
      <b>Zuletzt geschrieben von</b> {characterName}
    </span>
  );
}
