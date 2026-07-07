import { Children } from "react";
import { LcarsDataRow } from "@/components/lcars";

// Bündelt die Admin-Aktionen (Autolinking, Wikilinks entfernen, Text
// formatieren, …) der Inhalts-Detailseiten hinter einem DataRow-Akkordeon
// (siehe DataRow.tsx#children) statt eines eigenen Dropdown/Overlay-Panels
// — dasselbe Muster wie "User"/"Charaktere"/"Admin Actions" im
// Nutzerverwaltungs-Panel (/users/page.tsx). Rein generisch — kennt die
// einzelnen Tools nicht, rendert nur deren bestehende Button-Komponenten
// als children. Das Akkordeon-Panel klappt als normaler Block-Inhalt
// unterhalb der Zeile auf statt als absolut/fixed positioniertes Overlay
// — dadurch entfällt die frühere JS-Positionierung (Viewport-Clamping)
// vollständig, da ein Block-Element nie breiter als sein Container werden
// kann.
export default function ActionsMenu({
  label = "Aktionen",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <LcarsDataRow
      value={Children.count(children)}
      label={label}
      color="var(--lcars-purple)"
      className="my-[5px] max-w-[350px]"
    >
      <div className="admin-actions-menu-panel">{children}</div>
    </LcarsDataRow>
  );
}
