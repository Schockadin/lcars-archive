import { LcarsAkteCard, LcarsCollapsiblePanel } from "@/components/lcars";
import {
  CONTENT_DRAFT_COLOR,
  CONTENT_TYPE_LABEL,
} from "@/lib/contentTypeFormat";
import { fmtDate } from "@/lib/missionFormat";
import type { DraftItem } from "@/lib/drafts";

// „Entwürfe" — die eigenen unfertigen Inhalte, jeder mit dem Weg zurück in
// seinen Editor.
//
// Steht auf zwei Seiten: über der Liste unter „Meine Inhalte" und auf der
// Startseite. Ein Entwurf ist für niemanden außer seinem Besitzer sichtbar,
// nicht einmal für die Spielleitung — ohne eine Stelle, die ihn nennt, bleibt
// er leicht liegen. Genau dafür ist dieser Abschnitt da; die Liste darunter
// führt ihn zwar auch, aber zwischen allem anderen.
//
// Ganz ausgeblendet statt Leerzustand, wenn nichts offen ist: Nichts offen zu
// haben ist keine Meldung wert (gleiche Haltung wie FollowedContentSection).
export default function DraftsSection({
  drafts,
  storageId,
  defaultOpen = true,
}: {
  drafts: DraftItem[];
  storageId?: string;
  defaultOpen?: boolean;
}) {
  if (drafts.length === 0) return null;

  return (
    <LcarsCollapsiblePanel
      title="Entwürfe"
      badge={drafts.length}
      storageId={storageId}
      defaultOpen={defaultOpen}
    >
      <div className="flex flex-col gap-[6px]">
        {drafts.map((draft) => (
          <LcarsAkteCard
            key={`${draft.kind}-${draft.id}`}
            href={draft.href}
            // Die Zustandsfarbe „Entwurf", nicht die Typfarbe: Sie gilt
            // quer über alle Inhaltstypen und ist genau für diesen
            // Abschnitt gedacht (siehe CONTENT_DRAFT_COLOR). Welcher Typ es
            // ist, sagt die Meta-Zeile.
            color={CONTENT_DRAFT_COLOR}
            title={draft.title}
            meta={
              <>
                <span>
                  <b>Typ</b> {CONTENT_TYPE_LABEL[draft.kind]}
                </span>
                <span>
                  <b>Zuletzt</b> {fmtDate(draft.updatedAt)}
                </span>
              </>
            }
          />
        ))}
      </div>
    </LcarsCollapsiblePanel>
  );
}
