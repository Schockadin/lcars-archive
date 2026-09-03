"use client";
import DialogueThread from "@/components/DialogueThread";
import DialogueFlowingText from "@/components/DialogueFlowingText";
import DialogueViewToggle from "@/components/DialogueViewToggle";
import type { ArchiveEntryDetail } from "@/types/archive";
import type { Viewer } from "@/lib/visibility";
import type { DialogueMessage } from "@/lib/dialoguesCore";

// Der Gesprächsverlauf eines ABGESCHLOSSENEN Gesprächs als eigenständiger
// Inhalt (Single-Content-Ansicht unter /characters/dialogues/[slug]) — ohne
// die Archiv-Maschinerie (Owner-Auswahl, Attribut-Raster, Editor) der
// generischen Datenbank-Detailseite. Entspricht dem Dialog-Zweig, der früher
// in ArchiveEntryBody steckte: Fließtext (wörtliche Rede je Sprecher in
// dessen Farbe) oder Nachrichten-Thread, per Umschalter.
export default function DialogueContentView({
  entry,
  viewer,
  messages,
  flowingTextPreferred,
  canModerate,
}: {
  entry: ArchiveEntryDetail;
  viewer: Viewer | null;
  messages: DialogueMessage[];
  flowingTextPreferred: boolean;
  canModerate: boolean;
}) {
  if (messages.length === 0) {
    // Ohne strukturierte Nachrichten (z.B. per Vault-Ingest importierte
    // Gespräche) den rohen Inhalt zeigen statt „kein Inhalt".
    return entry.content ? (
      <div
        className="mission-body lcars-text"
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    ) : (
      <p className="lcars-empty-state">
        Kein Inhalt zu diesem Gespräch hinterlegt.
      </p>
    );
  }

  if (flowingTextPreferred && entry.content) {
    return (
      <>
        {viewer && (
          <DialogueViewToggle
            entrySlug={entry.slug}
            flowingTextEnabled={true}
          />
        )}
        <DialogueFlowingText messages={messages} />
      </>
    );
  }

  return (
    <>
      {viewer && entry.content && (
        <DialogueViewToggle entrySlug={entry.slug} flowingTextEnabled={false} />
      )}
      <DialogueThread
        messages={messages}
        participants={entry.metadata.participants}
        currentUserId={viewer?.userId ?? null}
        dialogueOpen={false}
        entrySlug={entry.slug}
        canModerate={canModerate}
      />
    </>
  );
}
