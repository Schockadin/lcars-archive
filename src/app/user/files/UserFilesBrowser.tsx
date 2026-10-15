"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { UserImage, LegacyUserImage } from "@/lib/userImages";
import type { UserCharacterFile } from "@/lib/userFiles";
import {
  deleteOwnImageAction,
  getOwnImagesAction,
  importOwnContentImageAction,
  uploadOwnImageAction,
} from "./actions";

export default function UserFilesBrowser({
  initialImages,
  initialLegacy,
  documents,
}: {
  initialImages: UserImage[];
  initialLegacy: LegacyUserImage[];
  documents: UserCharacterFile[];
}) {
  const [images, setImages] = useState(initialImages);
  const [legacy, setLegacy] = useState(initialLegacy);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const next = await getOwnImagesAction();
    setImages(next.images);
    setLegacy(next.legacy);
  }

  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      data.set("file", file);
      const result = await uploadOwnImageAction(data);
      if (result.error) setMessage(result.error);
      else await refresh();
    } catch {
      setMessage("Das Bild konnte nicht hochgeladen werden.");
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

  async function remove(id: number) {
    if (
      !window.confirm(
        "Bild wirklich löschen? Eingefügte Verweise auf dieses Bild funktionieren danach nicht mehr.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const result = await deleteOwnImageAction(id);
      if (result.error) setMessage(result.error);
      else await refresh();
    } catch {
      setMessage("Das Bild konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  const needle = query.trim().toLocaleLowerCase("de");
  const shownImages = images.filter((image) =>
    image.fileName.toLocaleLowerCase("de").includes(needle),
  );
  const shownDocuments = documents.filter((document) =>
    `${document.fileName} ${document.characterName}`
      .toLocaleLowerCase("de")
      .includes(needle),
  );

  return (
    <div className="lcars-text flex flex-col gap-[18px]">
      <p>
        Hier findest du deine Bilder und die Dateien deiner Charaktere. Bilder
        aus der Bibliothek kannst du in jedem Texteditor erneut einfügen.
      </p>
      <div className="flex flex-wrap items-center gap-[12px]">
        <label className="lcars-pill-btn cursor-pointer">
          Bild hochladen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        <input
          type="search"
          className="lcars-input rounded-full"
          aria-label="Dateien suchen"
          placeholder="Dateien suchen"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {message && (
        <p role="alert" className="text-lcars-quinary-ink">
          {message}
        </p>
      )}

      <section aria-labelledby="my-images-title">
        <h2 id="my-images-title">Meine Bilder ({images.length})</h2>
        {shownImages.length === 0 ? (
          <p>Keine passenden Bilder.</p>
        ) : (
          <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4">
            {shownImages.map((image) => (
              <div
                key={image.id}
                className="rounded-lcars bg-lcars-panel p-[10px] flex flex-col gap-[8px]"
              >
                <Image
                  src={image.url}
                  alt={image.fileName}
                  width={200}
                  height={150}
                  unoptimized
                  className="h-[150px] w-full object-contain"
                />
                <span className="break-all text-[13px]">{image.fileName}</span>
                <div className="flex flex-wrap gap-[8px]">
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="lcars-pill-btn--outline"
                  >
                    Öffnen
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(image.id)}
                    className="lcars-pill-btn--outline"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {legacy.length > 0 && (
        <section aria-labelledby="older-images-title">
          <h2 id="older-images-title">Ältere Bilder ({legacy.length})</h2>
          <p>
            Diese Bilder wurden vor der Bibliothek direkt an Inhalte angehängt.
            Übernimm sie, um sie überall erneut einzufügen.
          </p>
          <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4">
            {legacy.map((image) => (
              <div
                key={image.id}
                className="rounded-lcars bg-lcars-panel p-[10px] flex flex-col gap-[8px]"
              >
                <Image
                  src={image.previewUrl}
                  alt={`Bild ${image.id}`}
                  width={200}
                  height={150}
                  unoptimized
                  className="h-[150px] w-full object-contain"
                />
                <span>
                  {image.sourceType === "portrait"
                    ? `Profilbild von Charakter ${image.id}`
                    : `Bild ${image.id}`}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void importLegacy(image)}
                  className="lcars-pill-btn--outline"
                >
                  In Bibliothek übernehmen
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="my-documents-title">
        <h2 id="my-documents-title">Charakterdateien ({documents.length})</h2>
        {shownDocuments.length === 0 ? (
          <p>Keine passenden Dateien.</p>
        ) : (
          <ul className="flex flex-col gap-[8px]">
            {shownDocuments.map((document) => (
              <li
                key={document.id}
                className="rounded-lcars bg-lcars-panel p-[10px] flex flex-wrap items-center gap-[10px]"
              >
                <span className="break-all">{document.fileName}</span>
                <span className="text-lcars-ink-dim">
                  {document.characterName}
                </span>
                <a
                  href={document.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="lcars-pill-btn--outline"
                >
                  Ansehen
                </a>
                <a
                  href={document.downloadUrl}
                  className="lcars-pill-btn--outline"
                >
                  Herunterladen
                </a>
                <Link
                  href={`/user/characters/${document.characterId}`}
                  className="lcars-pill-btn--outline"
                >
                  Verwalten
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
