import { LcarsCollapsiblePanel } from "@/components/lcars";
import NewContentButtons from "./NewContentButtons";
import { visibleNewContentForms, type OpenForm } from "./newContentForms";
import type { NewContentData } from "./newContentData";

// Der Abschnitt „Neue Inhalte" — eine aufklappbare Klappe mit den
// Anlege-Knöpfen darin.
//
// Steht auf zwei Seiten: unter „Meine Inhalte" (alle Knöpfe, aufgeklappt —
// das ist dort der Zweck der Seite) und auf der Startseite (nur die im Profil
// eingeschalteten). Vorher trug jede Seite ihre eigene Fassung: die eine eine
// nackte Überschrift, die andere eine Klappe samt eigener Zählung, ob
// überhaupt ein Knopf übrig bleibt. Zwei Fassungen desselben Abschnitts
// laufen auseinander, und die Zählung war der Teil, der es zuerst getan
// hätte.
//
// Server-Komponente: Sie rechnet nur und reicht durch; der Client-Teil sind
// die Knöpfe selbst.
export default function NewContentPanel({
  data,
  show,
  canImport = false,
  title = "Neue Inhalte",
  storageId,
  defaultOpen = true,
}: {
  data: NewContentData;
  // Welche Knöpfe diese Seite anbietet. Ohne Angabe alle.
  show?: readonly OpenForm[];
  // Markdown-Import (/admin/import). Der Aufrufer muss admin.access geprüft
  // haben — siehe NewContentButtons.
  canImport?: boolean;
  title?: string;
  storageId?: string;
  defaultOpen?: boolean;
}) {
  // Dieselbe Funktion, aus der auch die Knopfleiste ihre Knöpfe bildet: Die
  // Zahl in der Kopfzeile kann so nicht von dem abweichen, was darunter
  // steht.
  const anzahl =
    visibleNewContentForms(data, show).length + (canImport ? 1 : 0);

  // Kein Knopf, kein Abschnitt — sonst stünde eine Überschrift über einer
  // leeren Zeile. Möglich etwa für ein Gast-Konto, das auf der Startseite
  // alle Anlege-Knöpfe abgewählt hat.
  if (anzahl === 0) return null;

  return (
    <LcarsCollapsiblePanel
      title={title}
      badge={anzahl}
      storageId={storageId}
      defaultOpen={defaultOpen}
    >
      <NewContentButtons data={data} show={show} canImport={canImport} />
    </LcarsCollapsiblePanel>
  );
}
