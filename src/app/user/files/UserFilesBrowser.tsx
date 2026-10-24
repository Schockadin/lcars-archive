"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LcarsListFilterInput,
  LcarsSortSwitch,
  type SortDir,
} from "@/components/lcars";
import ModalOverlay from "@/components/ModalOverlay";
import ChronoCard from "@/components/timeline/ChronoCard";
import ChronoRow from "@/components/timeline/ChronoRow";
import { DownloadIcon, EyeIcon, PencilIcon, TrashIcon } from "@/lib/icons";
import { CHARACTER_DOCUMENT_ACCEPT } from "@/lib/characterDocumentTypes";
import type { UserImage, LegacyUserImage } from "@/lib/userImages";
import type { ImageReference } from "@/lib/userImageReferences";
import type { OwnCharacterOption, UserCharacterFile } from "@/lib/userFiles";
import {
  deleteOwnFileAction,
  editOwnFileAction,
  getOwnFilesAction,
  importOwnContentImageAction,
  uploadOwnFileAction,
} from "./actions";

type FileRow =
  | {
      type: "image";
      id: number;
      fileName: string;
      createdAt: string;
      image: UserImage;
    }
  | {
      type: "document";
      id: number;
      fileName: string;
      createdAt: string;
      document: UserCharacterFile;
    };

type LegacyFileRow = {
  type: "legacy";
  id: number;
  fileName: string;
  createdAt: string;
  legacy: LegacyUserImage;
};

type FileListRow = FileRow | LegacyFileRow;
type FileFilter = "all" | "image" | "document" | "legacy";
type FileSortKey = "date" | "name";

const FILE_COLORS: Record<FileListRow["type"], string> = {
  image: "var(--lcars-tertiary)",
  document: "var(--lcars-primary)",
  legacy: "var(--lcars-secondary)",
};

const FILE_ACCEPT = `image/jpeg,image/png,image/webp,image/gif,${CHARACTER_DOCUMENT_ACCEPT}`;

export default function UserFilesBrowser({
  initialImages,
  initialLegacy,
  initialDocuments,
  initialCharacters,
  initialLinkedImages,
}: {
  initialImages: UserImage[];
  initialLegacy: LegacyUserImage[];
  initialDocuments: UserCharacterFile[];
  initialCharacters: OwnCharacterOption[];
  initialLinkedImages: Record<number, ImageReference[]>;
}) {
  const [images, setImages] = useState(initialImages);
  const [legacy, setLegacy] = useState(initialLegacy);
  const [documents, setDocuments] = useState(initialDocuments);
  const [characters, setCharacters] = useState(initialCharacters);
  const [linkedImages, setLinkedImages] = useState(initialLinkedImages);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FileFilter>("all");
  const [sortKey, setSortKey] = useState<FileSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCharacterId, setUploadCharacterId] = useState("");
  const [preview, setPreview] = useState<FileRow | null>(null);
  const [editing, setEditing] = useState<FileRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCharacterId, setEditCharacterId] = useState("");

  async function refresh() {
    const next = await getOwnFilesAction();
    setImages(next.images);
    setLegacy(next.legacy);
    setDocuments(next.documents);
    setCharacters(next.characters);
    setLinkedImages(next.linkedImages);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      data.set("file", selectedFile);
      if (!selectedFile.type.startsWith("image/")) {
        data.set("characterId", uploadCharacterId);
      }
      const result = await uploadOwnFileAction(data);
      if (result.error) setMessage(result.error);
      else {
        await refresh();
        setUploadOpen(false);
        setSelectedFile(null);
        setUploadCharacterId("");
      }
    } catch {
      setMessage("Die Datei konnte nicht hochgeladen werden.");
    } finally {
      setBusy(false);
    }
  }

  async function importLegacy(image: LegacyUserImage) {
    setBusy(true);
    setMessage("");
    try {
      const result = await importOwnContentImageAction(
        image.id,
        image.sourceType,
      );
      if (result.error) setMessage(result.error);
      else await refresh();
    } catch {
      setMessage("Das Bild konnte nicht übernommen werden.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(row: FileRow) {
    setEditing(row);
    setEditName(row.fileName);
    setEditCharacterId(
      row.type === "document" ? String(row.document.characterId ?? "") : "",
    );
    setMessage("");
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await editOwnFileAction(
        editing.type,
        editing.id,
        editName,
        editing.type === "document" && editCharacterId
          ? Number(editCharacterId)
          : null,
      );
      if (result.error) setMessage(result.error);
      else {
        await refresh();
        setEditing(null);
      }
    } catch {
      setMessage("Die Datei konnte nicht bearbeitet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: FileRow) {
    const warning =
      row.type === "image"
        ? `„${row.fileName}“ wirklich löschen? Verweise auf dieses Bild funktionieren danach nicht mehr.`
        : row.document.characterId
          ? `„${row.fileName}“ wirklich löschen? Das Dokument wird auch aus der Charakterakte entfernt.`
          : `„${row.fileName}“ wirklich löschen?`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await deleteOwnFileAction(row.type, row.id);
      if (result.error) setMessage(result.error);
      else await refresh();
    } catch {
      setMessage("Die Datei konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  const rows: FileListRow[] = [
    ...images.map((image) => ({
      type: "image" as const,
      id: image.id,
      fileName: image.fileName,
      createdAt: image.createdAt,
      image,
    })),
    ...documents.map((document) => ({
      type: "document" as const,
      id: document.id,
      fileName: document.fileName,
      createdAt: document.createdAt,
      document,
    })),
    ...legacy.map((image) => ({
      type: "legacy" as const,
      id: image.id,
      fileName:
        image.sourceType === "portrait"
          ? `Altes Charakterportrait #${image.id}`
          : `Altes Bild #${image.id}`,
      createdAt: image.createdAt,
      legacy: image,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const needle = query.trim().toLocaleLowerCase("de");
  const shown = rows
    .filter((row) => filter === "all" || row.type === filter)
    .filter((row) => {
      const linked =
        row.type === "image"
          ? (linkedImages[row.id] ?? []).map((ref) => ref.label).join(" ")
          : row.type === "document"
            ? (row.document.characterName ?? "")
            : (row.legacy.contentType ?? row.legacy.sourceType);
      return `${row.fileName} ${linked}`
        .toLocaleLowerCase("de")
        .includes(needle);
    })
    .sort((a, b) => {
      const comparison =
        sortKey === "name"
          ? a.fileName.localeCompare(b.fileName, "de", { sensitivity: "base" })
          : a.createdAt.localeCompare(b.createdAt);
      return sortDir === "asc" ? comparison : -comparison;
    });

  return (
    <div className="lcars-text flex flex-col gap-[18px]">
      <p>
        Hier verwaltest du Bilder und Dokumente. Bilder kannst du in Texte
        einfügen; Dokumente lassen sich einem deiner Charaktere zuordnen.
      </p>
      <div className="flex flex-wrap items-center gap-[12px]">
        <button
          type="button"
          className="lcars-pill-btn"
          onClick={() => {
            setUploadOpen(true);
            setMessage("");
          }}
        >
          Datei hochladen
        </button>
        <LcarsSortSwitch
          className="mission-sort"
          options={[
            { key: "date", label: "Datum", defaultDir: "desc" },
            { key: "name", label: "Name" },
          ]}
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(key, direction) => {
            setSortKey(key as FileSortKey);
            setSortDir(direction);
          }}
        />
        <LcarsListFilterInput
          value={query}
          onChange={setQuery}
          ariaLabel="Dateien filtern"
        />
        <select
          className="mission-author-filter rounded-full"
          value={filter}
          onChange={(event) => setFilter(event.target.value as FileFilter)}
          aria-label="Nach Dateityp filtern"
        >
          <option value="all">Alle Dateien</option>
          <option value="image">Bilder</option>
          <option value="document">Dokumente</option>
          <option value="legacy">Ältere Bilder</option>
        </select>
      </div>
      {message && !uploadOpen && !editing && (
        <p role="alert" className="text-lcars-quinary-ink">
          {message}
        </p>
      )}

      {legacy.length > 0 && (filter === "all" || filter === "legacy") && (
        <p className="text-lcars-ink-dim text-[12px]">
          Ältere Bilder wurden direkt an Inhalte angehängt. Übernimm sie in
          deine Bibliothek, um sie hier zu verwalten und erneut einzufügen.
        </p>
      )}
      {shown.length === 0 ? (
        <p className="lcars-empty-state">
          {rows.length === 0
            ? "Noch keine Dateien vorhanden."
            : "Keine Dateien für diesen Filter."}
        </p>
      ) : (
        <>
          <div className="archive-entry-list">
            {shown.map((row) => {
              const color = FILE_COLORS[row.type];
              const refs =
                row.type === "image" ? (linkedImages[row.id] ?? []) : [];
              const linkedContent =
                row.type === "document" &&
                row.document.characterId &&
                row.document.characterName ? (
                  <Link
                    href={`/user/characters/${row.document.characterId}`}
                    className="text-lcars-primary-ink underline"
                  >
                    {row.document.characterName}
                  </Link>
                ) : row.type === "document" ? (
                  "Nicht zugeordnet"
                ) : row.type === "image" ? (
                  refs.length > 0 ? (
                    <span className="flex flex-wrap gap-x-[10px] gap-y-[4px]">
                      {refs.map((ref) => (
                        <Link
                          key={ref.href}
                          href={ref.href}
                          className="text-lcars-primary-ink underline"
                        >
                          {ref.label}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    "Nicht verlinkt"
                  )
                ) : row.legacy.sourceType === "portrait" ? (
                  "Älteres Charakterportrait · Noch nicht in der Bibliothek"
                ) : (
                  "An Inhalt angehängt · Noch nicht in der Bibliothek"
                );

              const rowKey =
                row.type === "legacy"
                  ? `legacy:${row.legacy.sourceType}:${row.id}`
                  : `${row.type}:${row.id}`;

              return (
                <ChronoRow key={rowKey} date={row.createdAt} color={color}>
                  <div className="flex flex-1 flex-col gap-[8px] sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <ChronoCard
                        color={color}
                        thumbnailSrc={
                          row.type === "image"
                            ? row.image.url
                            : row.type === "legacy"
                              ? row.legacy.previewUrl
                              : undefined
                        }
                        tag={
                          row.type === "image"
                            ? "Bild"
                            : row.type === "document"
                              ? "Dokument"
                              : "Älteres Bild"
                        }
                        title={row.fileName}
                        meta={linkedContent}
                      />
                    </div>
                    {row.type === "legacy" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void importLegacy(row.legacy)}
                        className="lcars-pill-btn--outline"
                      >
                        In Bibliothek übernehmen
                      </button>
                    ) : (
                      <div className="flex gap-[6px]">
                        <button
                          type="button"
                          className="lcars-icon-btn size-[30px]"
                          aria-label={`„${row.fileName}“ ansehen`}
                          title="Ansehen"
                          onClick={() => setPreview(row)}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          className="lcars-icon-btn size-[30px]"
                          aria-label={`„${row.fileName}“ bearbeiten`}
                          title="Bearbeiten"
                          disabled={busy}
                          onClick={() => beginEdit(row)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="lcars-icon-btn lcars-icon-btn--danger size-[30px]"
                          aria-label={`„${row.fileName}“ löschen`}
                          title="Löschen"
                          disabled={busy}
                          onClick={() => void remove(row)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                </ChronoRow>
              );
            })}
          </div>
          <p className="lcars-eyebrow mt-[12px]">
            {shown.length === rows.length
              ? `${rows.length} Dateien`
              : `${shown.length} von ${rows.length} Dateien`}
          </p>
        </>
      )}

      {uploadOpen && (
        <ModalOverlay
          title="Datei hochladen"
          onClose={() => setUploadOpen(false)}
        >
          <form
            onSubmit={(event) => void upload(event)}
            className="flex flex-col gap-[12px]"
          >
            <label className="lcars-field-label" htmlFor="user-file-upload">
              Datei auswählen
            </label>
            <input
              id="user-file-upload"
              type="file"
              accept={FILE_ACCEPT}
              required
              className="lcars-input"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
            />
            <p className="text-lcars-ink-dim text-[12px]">
              Bilder bis 5 MB; PDF, Markdown, DOCX oder TXT bis 8 MB.
            </p>
            {selectedFile && !selectedFile.type.startsWith("image/") && (
              <label className="flex flex-col gap-[6px]">
                Charakter zuordnen (optional)
                <select
                  className="lcars-input"
                  value={uploadCharacterId}
                  onChange={(event) => setUploadCharacterId(event.target.value)}
                >
                  <option value="">Nicht zugeordnet</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {message && (
              <p role="alert" className="text-lcars-quinary-ink">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !selectedFile}
              className="lcars-pill-btn self-end disabled:opacity-50"
            >
              {busy ? "Wird hochgeladen…" : "Hochladen"}
            </button>
          </form>
        </ModalOverlay>
      )}

      {preview && (
        <ModalOverlay
          title={preview.fileName}
          onClose={() => setPreview(null)}
          width={1100}
          tall
        >
          {preview.type === "image" ? (
            <Image
              src={preview.image.url}
              alt={preview.fileName}
              width={960}
              height={720}
              unoptimized
              className="max-h-[76vh] w-full object-contain"
            />
          ) : (
            <>
              <iframe
                src={preview.document.previewUrl}
                title={`Vorschau: ${preview.fileName}`}
                sandbox={preview.document.kind === "pdf" ? undefined : ""}
                className="h-[76vh] min-h-[420px] w-full rounded-[6px] border border-lcars-border bg-white"
              />
              <a
                href={preview.document.downloadUrl}
                download={preview.fileName}
                className="lcars-pill-btn--outline inline-flex items-center gap-[7px] self-start"
              >
                <DownloadIcon /> Herunterladen
              </a>
            </>
          )}
        </ModalOverlay>
      )}

      {editing && (
        <ModalOverlay
          title="Datei bearbeiten"
          onClose={() => setEditing(null)}
          width={560}
        >
          <form
            onSubmit={(event) => void saveEdit(event)}
            className="flex flex-col gap-[12px]"
          >
            <label className="flex flex-col gap-[6px]">
              Dateiname
              <input
                type="text"
                required
                maxLength={200}
                className="lcars-input"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </label>
            {editing.type === "document" && (
              <label className="flex flex-col gap-[6px]">
                Charakter zuordnen (optional)
                <select
                  className="lcars-input"
                  value={editCharacterId}
                  onChange={(event) => setEditCharacterId(event.target.value)}
                >
                  <option value="">Nicht zugeordnet</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
                <span className="text-lcars-ink-dim text-[12px]">
                  Bei Dokumenten muss die Dateiendung erhalten bleiben.
                </span>
              </label>
            )}
            {message && (
              <p role="alert" className="text-lcars-quinary-ink">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="lcars-pill-btn self-end disabled:opacity-50"
            >
              {busy ? "Wird gespeichert…" : "Speichern"}
            </button>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}
