export default function DialogueReservationMeta({
  holderName,
}: {
  holderName: string | null;
}) {
  if (!holderName) return null;

  return (
    <span>
      <b>Antwortrecht reserviert von</b> {holderName}
    </span>
  );
}
