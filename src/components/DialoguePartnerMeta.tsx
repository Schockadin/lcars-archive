export default function DialoguePartnerMeta({
  names,
}: {
  names: string[];
}) {
  return (
    <span>
      <b>Gesprächspartner</b>{" "}
      {names.length > 0 ? names.join(", ") : "Unbekannt"}
    </span>
  );
}
