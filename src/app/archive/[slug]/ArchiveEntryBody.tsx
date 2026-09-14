"use client";
import ContentActionsPanel from "@/components/ContentActionsPanel";
import DialogueThread from "@/components/DialogueThread";
import DialogueFlowingText from "@/components/DialogueFlowingText";
import DialogueViewToggle from "@/components/DialogueViewToggle";
import ContentBody from "@/components/ContentBody";
import { ArchiveEntryDetail } from "@/types/archive";
import type { Viewer } from "@/lib/visibility";
import type { FollowState } from "@/app/actions/follows";
import type { DialogueMessage } from "@/lib/dialoguesCore";

// Der Inhalt eines Datenbank-Eintrags, read-only: Bearbeitet wird seit v1.34
// ausschließlich im vollen Editor unter /user/archive/[entryId]/edit (dorthin
// springt der Stift in ActionsMenu), wo auch Titel, Kategorie, Tags und
// Metadaten dranhängen. Der frühere Inline-Editor konnte nur den Fließtext.
export default function ArchiveEntryBody({
  entry,
  viewer,
  owners,
  messages,
  flowingTextPreferred,
  followInitialState,
}: {
  entry: ArchiveEntryDetail;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  messages: DialogueMessage[];
  // Globale User-Präferenz (siehe DialogueViewToggle.tsx) — nur relevant,
  // wenn dieser Eintrag ein Dialog MIT strukturierten Nachrichten ist.
  flowingTextPreferred: boolean;
  followInitialState?: FollowState;
}) {
  const canModerateDialogue =
    viewer?.permissions.includes("dialogues.moderate") ?? false;

  return (
    <>
      {entry.metadata.summary && entry.category != "dialogue" && (
        <p className="lcars-eyebrow mb-[5px]">{entry.metadata.summary}</p>
      )}

      {entry.category !== "dialogue" &&
        (entry.metadata.attributes.length > 0 ||
          entry.metadata.aliases.length > 0) && (
          <div className="char-file-data archive-entry-attrs">
            {entry.metadata.aliases.length > 0 && (
              <div className="char-file-field">
                <span className="char-file-field-label">
                  Auch bekannt als:
                </span>{" "}
                <span className="char-file-field-value">
                  {entry.metadata.aliases.join(", ")}
                </span>
              </div>
            )}
            {entry.metadata.attributes.map((attr) => (
              <div key={attr.label} className="char-file-field">
                <span className="char-file-field-label">{attr.label}:</span>{" "}
                <span className="char-file-field-value">{attr.value}</span>
              </div>
            ))}
          </div>
        )}

      {entry.category === "dialogue" ? (
        messages.length > 0 ? (
          flowingTextPreferred && entry.content ? (
            <>
              {viewer && (
                <DialogueViewToggle
                  entrySlug={entry.slug}
                  flowingTextEnabled={true}
                />
              )}
              {/* Aus den Nachrichten gerendert (statt entry.content), damit die
                  wörtliche Rede pro Sprecher in dessen Charakter-Farbe
                  erscheint — siehe DialogueFlowingText.tsx. entry.content
                  bleibt oben nur die Bedingung "Fließtext wurde erzeugt". */}
              <DialogueFlowingText messages={messages} />
            </>
          ) : (
            <>
              {viewer && entry.content && (
                <DialogueViewToggle
                  entrySlug={entry.slug}
                  flowingTextEnabled={false}
                />
              )}
              <DialogueThread
                messages={messages}
                participants={entry.metadata.participants}
                currentUserId={viewer?.userId ?? null}
                dialogueOpen={false}
                entrySlug={entry.slug}
                canModerate={canModerateDialogue}
              />
            </>
          )
        ) : entry.content ? (
          // Ohne dialogue_messages (z.B. per Vault-Ingest importierte
          // Gespräche ohne strukturierte Nachrichten) den rohen Inhalt
          // zeigen statt fälschlich "Kein Inhalt hinterlegt" — der Text
          // existiert ja, nur eben nicht als Nachrichten-Thread.
          <div
            className="mission-body lcars-text"
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
        ) : (
          <p className="lcars-empty-state">
            Kein Inhalt zu diesem Eintrag hinterlegt.
          </p>
        )
      ) : entry.content ? (
        <ContentBody html={entry.content} />
      ) : (
        <p className="lcars-empty-state">
          Kein Inhalt zu diesem Eintrag hinterlegt.
        </p>
      )}

      <ContentActionsPanel
        viewer={viewer}
        owners={owners}
        contentType="archiveEntry"
        followType="archive_entry"
        followInitialState={followInitialState}
        playerId={entry.ownerUserId}
        content={entry}
        hideEdit={entry.category === "dialogue"}
        // Dialoge haben keine eigene Bilder-Galerie (der Inhalt lebt in
        // dialogue_messages, siehe ActionsMenu.tsx).
        imageContentType={entry.category === "dialogue" ? null : "archive_entry"}
        imageContentId={entry.id}
      />
    </>
  );
}
