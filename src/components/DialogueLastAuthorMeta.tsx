export default function DialogueLastAuthorMeta({
  authorName,
}: {
  authorName: string | null;
}) {
  if (!authorName) return null;

  return (
    <span>
      <b>Zuletzt geschrieben von</b> {authorName}
    </span>
  );
}
