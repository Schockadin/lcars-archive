"use client";
import { useOptimistic } from "react";
import { LcarsAkteCard, LcarsCollapsiblePanel } from "@/components/lcars";
import ContentActionRow from "@/app/user/content/ContentActionRow";
import ContentStateSelect from "@/app/user/content/ContentStateSelect";
import DeleteOwnContentButton from "@/app/user/content/DeleteOwnContentButton";
import type { VisibilityContentType } from "@/app/user/content/actions";
import {
  CONTENT_DRAFT_COLOR,
  CONTENT_TYPE_LABEL,
} from "@/lib/contentTypeFormat";
import { fmtDate } from "@/lib/missionFormat";
import type { DraftItem } from "@/lib/drafts";

// „Entwürfe" — die eigenen unfertigen Inhalte, jeder mit dem Weg zu seiner
// eigentlichen Inhaltsseite und derselben Aktionszeile wie in der Liste unter
// „Meine Inhalte" (ContentActionRow: Veröffentlichen-Schalter, Stift,
// Mülleimer). Nur der ausdrückliche Stift führt direkt in den Editor.
//
// Steht auf zwei Seiten: über der Liste unter „Meine Inhalte" und auf der
// Startseite. Ein Entwurf ist für niemanden außer seinem Besitzer sichtbar,
// nicht einmal für die Spielleitung — ohne eine Stelle, die ihn nennt, bleibt
// er leicht liegen. Genau dafür ist dieser Abschnitt da; die Liste darunter
// führt ihn zwar auch, aber zwischen allem anderen.
//
// Client-Komponente, seit die Aktionszeile dazugehört: Sowohl der Schalter
// als auch der Mülleimer entfernen ihren Eintrag OPTIMISTISCH aus dieser
// Liste — veröffentlicht ist er kein Entwurf mehr und gehört nicht mehr
// hierher. Beides läuft über denselben useOptimistic-Reducer, damit React
// den Eintrag bei einer fehlgeschlagenen Action von selbst zurückholt (die
// Actions revalidieren dafür „/" mit, siehe actions.ts).
//
// Ganz ausgeblendet statt Leerzustand, wenn nichts offen ist: Nichts offen zu
// haben ist keine Meldung wert (gleiche Haltung wie FollowedContentSection).

// Der Schalter kennt Missionen nicht: Eine Mission hat kein
// Einzel-Owner-Modell und deshalb keinen Entwurf/Veröffentlicht-Umschalter in
// der Liste (siehe VisibilityContentType und die Missionszeilen in
// UserContentBrowser). Gelöscht werden darf sie trotzdem.
function switchType(kind: DraftItem["kind"]): VisibilityContentType | null {
  return kind === "mission" ? null : kind;
}

function draftKey(draft: DraftItem): string {
  return `${draft.kind}-${draft.id}`;
}

export default function DraftsSection({
  drafts,
  storageId,
  defaultOpen = true,
}: {
  drafts: DraftItem[];
  storageId?: string;
  defaultOpen?: boolean;
}) {
  // Ein Reducer für beide Wege hinaus (veröffentlicht oder gelöscht) — was
  // hier verschwindet, verschwindet aus demselben Grund: Es ist kein offener
  // Entwurf mehr.
  const [offeneEntwuerfe, entfernen] = useOptimistic(
    drafts,
    (aktuelle: DraftItem[], key: string) =>
      aktuelle.filter((d) => draftKey(d) !== key),
  );

  if (offeneEntwuerfe.length === 0) return null;

  return (
    <LcarsCollapsiblePanel
      title="Entwürfe"
      badge={offeneEntwuerfe.length}
      storageId={storageId}
      defaultOpen={defaultOpen}
    >
      {/* Gedeckelt wie die Charakter-Übersicht (OwnCharacterList), die
          dieselbe Zeile aus Akte und Aktionen trägt: Über ~900px zerreißt
          sie optisch — die Akte wächst weiter, die Knöpfe bleiben rechts
          stehen. Ohne Aktionszeile war das hier kein Thema. */}
      <div className="flex w-full max-w-[900px] flex-col gap-[6px]">
        {offeneEntwuerfe.map((draft) => {
          const key = draftKey(draft);
          const umschalten = switchType(draft.kind);
          return (
            // Karte und Aktionszeile nebeneinander (auf dem Telefon
            // untereinander) — dieselbe Aufteilung wie in der Liste unter
            // „Meine Inhalte": Die Karte nimmt den Platz, der übrig bleibt.
            <div
              key={key}
              className="flex flex-col gap-[8px] sm:flex-row sm:items-center"
            >
              <LcarsAkteCard
                className="flex-1"
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
              <ContentActionRow
                state={
                  umschalten ? (
                    <ContentStateSelect
                      contentType={umschalten}
                      id={draft.id}
                      isDraft
                      onPublished={() => entfernen(key)}
                    />
                  ) : undefined
                }
                // Die Karte öffnet den eigentlichen Eintrag; der ausdrückliche
                // Stift bleibt der direkte Weg in dessen Editor.
                editHref={draft.editHref}
                deleteButton={
                  <DeleteOwnContentButton
                    contentType={draft.kind}
                    id={draft.id}
                    onOptimisticDelete={() => entfernen(key)}
                  />
                }
              />
            </div>
          );
        })}
      </div>
    </LcarsCollapsiblePanel>
  );
}
