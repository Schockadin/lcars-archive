"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  uploadContentImagesAction,
  deleteContentImageAction,
  getContentImagesAction,
} from "@/app/actions/contentImages";
import type { ContentImage, ContentImageType } from "@/lib/contentImages";
import ContentToolPreviewOverlay from "./ContentToolPreviewOverlay";
import { ImageIcon, UploadIcon, TrashIcon, XIcon } from "@/lib/icons";

// Bilder-Galerie für Charaktere/Missionen/Missionslogs/Archiv-Einträge
// (nicht Dialoge) — analog zu AutolinkButton.tsx als Icon-Button + Modal
// (ContentToolPreviewOverlay), da ActionsMenu.tsx nur eine schmale Spalte
// aus Icon-Buttons ist und eine dauerhaft eingebettete Galerie den Rahmen
// jeder Detailseite sprengen würde. Lädt die Bilderliste client-seitig beim
// Öffnen (gleiches Muster wie getFollowState/getDialogueSnapshotAction)
// statt sie als RSC-Prop durchzureichen — vermeidet, jede der vier
// Detailseiten um eine weitere Server-seitige Ladefunktion zu erweitern.
export default function ContentImageGallery({
  contentType,
  contentId,
  canManage,
}: {
  contentType: ContentImageType;
  contentId: number;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  // null = noch nicht geladen (Ladeanzeige), sonst das Ergebnis des letzten
  // Ladens/Upload/Löschens.
  const [images, setImages] = useState<ContentImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getContentImagesAction(contentType, contentId).then((result) => {
      if (!cancelled) setImages(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open, contentType, contentId]);

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.set("contentType", contentType);
    formData.set("contentId", String(contentId));
    for (const file of files) formData.append("files", file);

    startTransition(async () => {
      const result = await uploadContentImagesAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setImages(result.images ?? []);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(imageId: number) {
    startTransition(async () => {
      const result = await deleteContentImageAction(contentType, contentId, imageId);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setImages(result.images ?? []);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-icon-btn self-start"
        aria-label="Bilder"
        title="Bilder"
      >
        <ImageIcon />
      </button>
      {open && (
        <ContentToolPreviewOverlay title="Bilder" onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between gap-[12px]">
            <p className="lcars-eyebrow">Bilder</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="lcars-icon-btn size-[32px]"
              aria-label="Schließen"
              title="Schließen"
            >
              <XIcon />
            </button>
          </div>

          {images === null && <p className="text-[13px]">Lädt…</p>}

          {images !== null && images.length === 0 && (
            <p className="text-[13px]">Noch keine Bilder hochgeladen.</p>
          )}

          {images !== null && images.length > 0 && (
            <div className="flex flex-wrap gap-[10px]">
              {images.map((image) => (
                <div key={image.id} className="relative">
                  <Image
                    src={`/api/content-images/${image.id}`}
                    alt=""
                    width={100}
                    height={100}
                    unoptimized
                    className="size-[100px] object-cover rounded-[4px]"
                  />
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(image.id)}
                      disabled={pending}
                      className="lcars-icon-btn lcars-icon-btn--danger absolute top-[2px] right-[2px] size-[28px] disabled:opacity-50"
                      aria-label="Bild löschen"
                      title="Bild löschen"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <div className="flex flex-col gap-[6px] items-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                disabled={pending}
                className="hidden"
                id="content-image-upload-input"
              />
              <label
                htmlFor="content-image-upload-input"
                className="lcars-pill-btn--outline flex items-center gap-[6px] cursor-pointer"
              >
                <UploadIcon />
                {pending ? "Wird hochgeladen…" : "Bild hochladen"}
              </label>
            </div>
          )}

          {error && (
            <p className="text-lcars-red text-[13px]" role="alert">
              {error}
            </p>
          )}
        </ContentToolPreviewOverlay>
      )}
    </>
  );
}
