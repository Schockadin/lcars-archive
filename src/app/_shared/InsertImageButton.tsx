"use client";
import { useState } from "react";
import Image from "next/image";
import { getContentImagesAction } from "@/app/actions/contentImages";
import {
  getOwnImagesAction,
  importOwnContentImageAction,
} from "@/app/user/files/actions";
import { insertAtCursor } from "@/lib/textareaEdit";
import { contentImageSrc } from "@/lib/contentRoutes";
import ContentToolPreviewOverlay from "@/components/ContentToolPreviewOverlay";
import type { ContentImage, ContentImageType } from "@/lib/contentImages";
import type { UserImage, LegacyUserImage } from "@/lib/userImages";
import { ImageIcon } from "@/lib/icons";

export default function InsertImageButton({
  textareaId,
  contentType,
  contentId,
}: {
  textareaId: string;
  contentType?: ContentImageType;
  contentId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ContentImage[]>([]);
  const [library, setLibrary] = useState<UserImage[]>([]);
  const [legacy, setLegacy] = useState<LegacyUserImage[]>([]);
  const [error, setError] = useState("");

  async function openPicker() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const [own, content] = await Promise.all([
        getOwnImagesAction(),
        contentType && contentId
          ? getContentImagesAction(contentType, contentId)
          : Promise.resolve([]),
      ]);
      setLibrary(own.images);
      setLegacy(own.legacy);
      setImages(content);
    } catch {
      setError("Bilder konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  function insert(src: string) {
    const textarea = document.getElementById(textareaId);
    if (textarea instanceof HTMLTextAreaElement) {
      insertAtCursor(textarea, `![Bild](${src})`, { ownLine: true });
    }
    setOpen(false);
  }

  async function importAndInsert(image: LegacyUserImage) {
    setLoading(true);
    try {
      const result = await importOwnContentImageAction(
        image.id,
        image.sourceType,
      );
      if (result.error || !result.image) {
        setError(result.error ?? "Bild konnte nicht übernommen werden.");
      } else {
        insert(result.image.url);
      }
    } catch {
      setError("Bild konnte nicht übernommen werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openPicker()}
        className="lcars-icon-btn"
        aria-label="Bild einfügen"
        title="Bild einfügen"
      >
        <ImageIcon />
      </button>
      {open && (
        <ContentToolPreviewOverlay
          title="Bild einfügen"
          onClose={() => setOpen(false)}
        >
          <p className="lcars-eyebrow">Bild einfügen</p>
          {loading && <p className="text-[13px]">Lädt…</p>}
          {error && (
            <p role="alert" className="text-lcars-quinary-ink">
              {error}
            </p>
          )}
          {!loading &&
            !error &&
            images.length + library.length + legacy.length === 0 && (
              <p className="text-[13px]">
                Noch keine Bilder vorhanden. Du kannst welche unter „Meine
                Dateien“ hochladen.
              </p>
            )}
          {images.length > 0 && (
            <section>
              <h3>Bilder dieses Inhalts</h3>
              <div className="flex flex-wrap gap-[10px]">
                {images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => insert(contentImageSrc(image.id))}
                    aria-label={`Bild ${image.id} einfügen`}
                  >
                    <Image
                      src={contentImageSrc(image.id)}
                      alt=""
                      width={100}
                      height={100}
                      unoptimized
                      className="size-[100px] object-cover rounded-[4px]"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
          {library.length > 0 && (
            <section>
              <h3>Meine Bilder</h3>
              <div className="flex flex-wrap gap-[10px]">
                {library.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => insert(image.url)}
                    aria-label={`${image.fileName} einfügen`}
                    title={image.fileName}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      width={100}
                      height={100}
                      unoptimized
                      className="size-[100px] object-cover rounded-[4px]"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
          {legacy.length > 0 && (
            <section>
              <h3>Ältere Bilder übernehmen</h3>
              <div className="flex flex-wrap gap-[10px]">
                {legacy.map((image) => (
                  <button
                    key={`${image.sourceType}-${image.id}`}
                    type="button"
                    disabled={loading}
                    onClick={() => void importAndInsert(image)}
                    aria-label={`Älteres Bild ${image.id} übernehmen und einfügen`}
                  >
                    <Image
                      src={image.previewUrl}
                      alt=""
                      width={100}
                      height={100}
                      unoptimized
                      className="size-[100px] object-cover rounded-[4px]"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
        </ContentToolPreviewOverlay>
      )}
    </>
  );
}
