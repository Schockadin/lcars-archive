"use client";
import { useState } from "react";
import ActionsMenu from "@/components/ActionsMenu";
import DialogueThread from "@/components/DialogueThread";
import DialogueFlowingText from "@/components/DialogueFlowingText";
import DialogueViewToggle from "@/components/DialogueViewToggle";
import ArchiveEntryEditor from "./ArchiveEntryEditor";
import { ArchiveEntryDetail } from "@/types/archive";
import { Viewer } from "@/lib/visibility";
import type { DialogueMessage } from "@/lib/dialoguesCore";

// Hält den editMode lokal (statt über einen globalen Context) — ActionsMenu
// (Bearbeiten-Button) und ArchiveEntryEditor sind hier Geschwister unter
// einem gemeinsamen Client-Component-Elternknoten, exakt das React-Standard-
// muster "State nach oben heben". Die Elternseite (page.tsx) bleibt eine
// async Server Component und kann diesen State nicht selbst halten.
export default function ArchiveEntryBody({
  entry,
  viewer,
  owners,
  messages,
  flowingTextPreferred,
}: {
  entry: ArchiveEntryDetail;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  messages: DialogueMessage[];
  // Globale User-Präferenz (siehe DialogueViewToggle.tsx) — nur relevant,
  // wenn dieser Eintrag ein Dialog MIT strukturierten Nachrichten ist.
  flowingTextPreferred: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const isAdminOrGM = viewer?.role === "gm" || viewer?.role === "admin" || false;

  return (
    <>
      <ActionsMenu
        viewer={viewer}
        owners={owners}
        contentType="archiveEntry"
        followType="archive_entry"
        playerId={entry.ownerUserId}
        content={entry}
        onEdit={() => setEditMode(true)}
        hideEdit={entry.category === "dialogue"}
      />

      {entry.metadata.summary && entry.category != "dialogue" && (
        <p className="lcars-eyebrow mb-[5px]">{entry.metadata.summary}</p>
      )}

      {entry.category !== "dialogue" &&
        entry.metadata.attributes.length > 0 && (
          <div className="char-file-data archive-entry-attrs">
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
                viewerRole={viewer?.role ?? null}
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
        <ArchiveEntryEditor
          entryId={entry.id}
          contentHtml={entry.content}
          sourceMarkdown={entry.sourceMarkdown}
          isAdminOrGM={isAdminOrGM}
          editMode={editMode}
          onEditModeChange={setEditMode}
        />
      ) : (
        <p className="lcars-empty-state">
          Kein Inhalt zu diesem Eintrag hinterlegt.
        </p>
      )}
    </>
  );
}
