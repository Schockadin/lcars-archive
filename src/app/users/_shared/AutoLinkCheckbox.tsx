// Opt-in unterhalb der Content-Textareas (für alle, nicht nur Admin/GM):
// wendet beim Speichern Autolinking auf den Text an (siehe
// autoLinkMarkdown in src/lib/autolink.ts) — dieselbe Erkennung wie das
// admin-only "Autolinking"-Werkzeug (AutolinkButton.tsx), hier direkt beim
// Anlegen/Bearbeiten statt als separater Schritt danach. Unchecked per
// Default, da eine automatische Textänderung beim Speichern keine
// Überraschung sein soll. Reiner Formular-Checkbox-Wert (name="autoLink"),
// serverseitig ausgewertet als formData.get("autoLink") === "on".
export default function AutoLinkCheckbox({
  idPrefix = "content",
}: {
  idPrefix?: string;
}) {
  const id = `${idPrefix}-auto-link`;
  return (
    <div className="flex items-center gap-[8px]">
      <input
        id={id}
        name="autoLink"
        type="checkbox"
        className="h-[16px] w-[16px]"
      />
      <label htmlFor={id} className="lcars-text text-[14px]">
        Automatisch verlinken (erkennt Charaktere, Missionen und Archiv-Einträge
        im Text und verlinkt sie)
      </label>
    </div>
  );
}
