"use client";
import { useState } from "react";
import ActionsMenu from "@/components/ActionsMenu";
import DialogueThread from "@/components/DialogueThread";
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
}: {
  entry: ArchiveEntryDetail;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  messages: DialogueMessage[];
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
          <DialogueThread
            messages={messages}
            participants={entry.metadata.participants}
            currentUserId={null}
            dialogueOpen={false}
          />
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
