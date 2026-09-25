"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { LcarsCollapsiblePanel } from "@/components/lcars";
import ModalOverlay from "@/components/ModalOverlay";
import {
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UploadIcon,
} from "@/lib/icons";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  CHARACTER_DOCUMENT_ACCEPT,
  type CharacterDocument,
} from "@/lib/characterDocumentTypes";
import {
  deleteCharacterDocumentAction,
  renameCharacterDocumentAction,
  uploadCharacterDocumentAction,
  type CharacterDocumentActionState,
} from "./documentActions";
import {
  FormError,
  FormField,
  FormSuccess,
  SubmitButton,
} from "@/app/_shared/FormPrimitives";
import {
  characterDocumentDisplayName,
  characterDocumentKindLabel,
} from "@/lib/characterDocumentNames";

const initialState: CharacterDocumentActionState = {};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeleteDocumentForm({
  characterId,
  document,
}: {
  characterId: number;
  document: CharacterDocument;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCharacterDocumentAction,
    initialState,
  );
  return (
    <form action={formAction} className="flex flex-col items-end gap-[4px]">
      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="documentId" value={document.id} />
      <button
        type="submit"
        disabled={pending}
        className="lcars-icon-btn lcars-icon-btn--danger size-[30px] disabled:opacity-50"
        aria-label={`Dokument „${document.fileName}“ löschen`}
        title="Dokument löschen"
        onClick={confirmSubmit(`„${document.fileName}“ wirklich löschen?`)}
      >
        <TrashIcon />
      </button>
      <FormError message={state.error} />
    </form>
  );
}

function UploadDocumentForm({ characterId }: { characterId: number }) {
  const [state, formAction, pending] = useActionState(
    uploadCharacterDocumentAction,
    initialState,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.success && inputRef.current) inputRef.current.value = "";
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="characterId" value={characterId} />
      <label
        className="lcars-field-label"
        htmlFor={`character-document-${characterId}`}
      >
        Dokument auswählen
      </label>
      <input
        ref={inputRef}
        id={`character-document-${characterId}`}
        name="file"
        type="file"
        accept={CHARACTER_DOCUMENT_ACCEPT}
        required
        className="lcars-input"
      />
      <p className="text-lcars-ink-dim text-[12px]">
        PDF, Markdown, DOCX oder TXT · maximal 8 MB. Das Dokument bleibt in
        deiner privaten Charakterakte und kann direkt im Browser gelesen werden.
      </p>
      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
      <SubmitButton
        pending={pending}
        pendingLabel="Wird hochgeladen…"
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        <UploadIcon /> Dokument hochladen
      </SubmitButton>
    </form>
  );
}

function RenameDocumentForm({
  characterId,
  document,
}: {
  characterId: number;
  document: CharacterDocument;
}) {
  const [state, formAction, pending] = useActionState(
    renameCharacterDocumentAction,
    initialState,
  );
  const inputId = `character-document-${document.id}-name`;

  return (
    <form action={formAction} className="flex flex-col" data-no-draft>
      <input type="hidden" name="characterId" value={characterId} />
      <input type="hidden" name="documentId" value={document.id} />
      <FormField
        label="Dateiname"
        htmlFor={inputId}
        hint={`Die Dateiendung .${document.kind} muss erhalten bleiben.`}
      >
        <input
          id={inputId}
          name="fileName"
          type="text"
          required
          maxLength={200}
          defaultValue={document.fileName}
          className="lcars-input"
          autoFocus
        />
      </FormField>
      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
      <SubmitButton
        pending={pending}
        pendingLabel="Wird umbenannt…"
        className="lcars-pill-btn--outline self-end disabled:opacity-50"
      >
        Dateiname speichern
      </SubmitButton>
    </form>
  );
}

export default function CharacterDocumentsPanel({
  characterId,
  documents,
  readOnly = false,
  defaultOpen = true,
  storageId,
}: {
  characterId: number;
  documents: CharacterDocument[];
  readOnly?: boolean;
  defaultOpen?: boolean;
  storageId?: string;
}) {
  const [openDocument, setOpenDocument] = useState<CharacterDocument | null>(
    null,
  );
  const [renameDocument, setRenameDocument] =
    useState<CharacterDocument | null>(null);

  return (
    <>
      <LcarsCollapsiblePanel
        title="Zusätzliche Dokumente"
        badge={documents.length}
        storageId={storageId ?? `character:${characterId}:documents`}
        defaultOpen={defaultOpen}
      >
        {documents.length === 0 ? (
          <p className="lcars-empty-state">Noch keine Dokumente hinterlegt.</p>
        ) : (
          <ul className="flex flex-col gap-[8px]">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center gap-[8px] border-b border-lcars-border pb-[8px]"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 bg-transparent text-left text-lcars-ink-data"
                  onClick={() => setOpenDocument(document)}
                >
                  <span className="flex min-w-0 items-center gap-[7px]">
                    <span className="size-[20px] shrink-0">
                      <EyeIcon />
                    </span>
                    <span
                      className="min-w-0 truncate"
                      title={document.fileName}
                    >
                      {characterDocumentDisplayName(document.fileName)}
                    </span>
                  </span>
                  <span className="ml-[27px] block text-[12px] text-lcars-ink-dim">
                    {characterDocumentKindLabel(document.kind)} ·{" "}
                    {formatSize(document.sizeBytes)}
                  </span>
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    className="lcars-icon-btn size-[30px]"
                    aria-label={`Dokument „${document.fileName}“ umbenennen`}
                    title="Umbenennen"
                    onClick={() => setRenameDocument(document)}
                  >
                    <PencilIcon />
                  </button>
                )}
                <a
                  href={document.downloadUrl}
                  download={document.fileName}
                  className="lcars-icon-btn size-[30px]"
                  aria-label={`Dokument „${document.fileName}“ herunterladen`}
                  title="Herunterladen"
                >
                  <DownloadIcon />
                </a>
                {!readOnly && (
                  <DeleteDocumentForm
                    characterId={characterId}
                    document={document}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && <UploadDocumentForm characterId={characterId} />}
      </LcarsCollapsiblePanel>

      {openDocument && (
        <ModalOverlay
          title={openDocument.fileName}
          onClose={() => setOpenDocument(null)}
          width={1100}
          tall
        >
          <iframe
            src={openDocument.previewUrl}
            title={`Vorschau: ${openDocument.fileName}`}
            sandbox=""
            className="h-[76vh] min-h-[420px] w-full rounded-[6px] border border-lcars-border bg-white"
          />
          <a
            href={openDocument.downloadUrl}
            download={openDocument.fileName}
            className="lcars-pill-btn--outline inline-flex items-center gap-[7px] self-start"
          >
            <DownloadIcon /> Herunterladen
          </a>
        </ModalOverlay>
      )}

      {renameDocument && (
        <ModalOverlay
          title="Dokument umbenennen"
          onClose={() => setRenameDocument(null)}
          width={560}
        >
          <RenameDocumentForm
            characterId={characterId}
            document={renameDocument}
          />
        </ModalOverlay>
      )}
    </>
  );
}
