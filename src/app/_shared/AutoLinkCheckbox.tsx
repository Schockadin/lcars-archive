// Opt-in unterhalb der Content-Textareas (für alle, nicht nur Admin/GM):
// wendet beim Speichern Autolinking auf den Text an (siehe
// autoLinkMarkdown in src/lib/autolink.ts) — dieselbe Erkennung wie das
// admin-only "Autolinking"-Werkzeug (ContentLinkToolButton.tsx), hier direkt beim
// Anlegen/Bearbeiten statt als separater Schritt danach. Bei NEUEN Inhalten
// standardmäßig aktiv (defaultChecked, seit PR #51) — dort ist automatisches
// Verlinken erwünschtes Standardverhalten; beim Bearbeiten bleibt es aus, um
// eine unerwartete Textänderung an bestehenden Inhalten zu vermeiden. Reiner
// Formular-Checkbox-Wert (name="autoLink"), serverseitig ausgewertet als
// formData.get("autoLink") === "on".
export default function AutoLinkCheckbox({
  idPrefix = "content",
  defaultChecked = false,
}: {
  idPrefix?: string;
  defaultChecked?: boolean;
}) {
  const id = `${idPrefix}-auto-link`;
  return (
    <div className="flex items-center gap-[8px]">
      <input
        id={id}
        name="autoLink"
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-[16px] w-[16px]"
      />
      <label htmlFor={id} className="lcars-text text-[14px]">
        Automatisch verlinken (erkennt Charaktere, Missionen und Archiv-Einträge
        im Text und verlinkt sie)
      </label>
    </div>
  );
}
