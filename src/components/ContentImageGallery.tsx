"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  uploadContentImagesAction,
  deleteContentImageAction,
  getContentImagesAction,
  setCharacterPortraitAction,
} from "@/app/actions/contentImages";
import type { ContentImage, ContentImageType } from "@/lib/contentImages";
import ContentToolPreviewOverlay from "./ContentToolPreviewOverlay";
import {
  ImageIcon,
  UploadIcon,
  TrashIcon,
  XIcon,
  PortraitIcon,
} from "@/lib/icons";
import { contentImageSrc } from "@/lib/contentRoutes";
import {
  MAX_UPLOAD_BYTES,
  formatMegabytes,
  prepareImageForUpload,
  rejectionReason,
  uploadErrorMessage,
} from "@/lib/imageUpload";

// Bilder-Galerie für Charaktere/Missionen/Missionslogs/Archiv-Einträge
// (nicht Dialoge) — analog zu ContentLinkToolButton.tsx als Icon-Button + Modal
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
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getContentImagesAction(contentType, contentId)
      .then((result) => {
        if (!cancelled) setImages(result);
      })
      .catch(() => {
        // Auch hier: ein Fehlschlag darf nicht als ewiges „Lädt…" enden.
        if (cancelled) return;
        setImages([]);
        setError("Die Bilderliste konnte nicht geladen werden.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, contentType, contentId]);

  // Jede Datei einzeln — und vorher verkleinert.
  //
  // Vorher gingen alle gewählten Bilder als EIN Formular in voller Größe an
  // die Server Action. Eine Server Action ist eine normale Anfrage an die
  // Funktion, die die App ausliefert, und die hat auf der Plattform ein hartes
  // Größenlimit (Netlify/Lambda: 6 MB inklusive Multipart-Rahmen). Wird das
  // gerissen, weist die Plattform die Anfrage ab, bevor unser Code sie sieht:
  // die Action meldet keinen Fehler, sie kommt nie an. Zusammen mit dem
  // fehlenden try/catch unten blieb die Anzeige deshalb bei „Wird
  // hochgeladen…" stehen — ohne Fehler, ohne Ergebnis.
  //
  // Deshalb: pro Datei eine Anfrage (jede für sich klein genug), große Bilder
  // vorher im Browser verkleinern (siehe src/lib/imageUpload.ts), und JEDER
  // Fehlschlag wird angezeigt statt verschluckt.
  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const selected = [...files];

    startTransition(async () => {
      const problems: string[] = [];
      let latest: ContentImage[] | null = null;

      for (const original of selected) {
        const reason = rejectionReason(original);
        if (reason) {
          problems.push(reason);
          continue;
        }

        const file = await prepareImageForUpload(original);
        const formData = new FormData();
        formData.set("contentType", contentType);
        formData.set("contentId", String(contentId));
        formData.append("files", file);

        try {
          const result = await uploadContentImagesAction({}, formData);
          if (result.error) {
            problems.push(`„${original.name}": ${result.error}`);
          } else if (result.images) {
            latest = result.images;
          }
        } catch {
          // Abgewiesene oder abgebrochene Anfrage (Größenlimit der Plattform,
          // Verbindung weg). Ohne dieses catch bliebe die Transition hängen.
          problems.push(uploadErrorMessage(file));
        }
      }

      if (latest) setImages(latest);
      setError(problems.length > 0 ? problems.join(" ") : null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(imageId: number) {
    startTransition(async () => {
      try {
        const result = await deleteContentImageAction(
          contentType,
          contentId,
          imageId,
        );
        if (result.error) {
          setError(result.error);
        } else {
          setError(null);
          setImages(result.images ?? []);
        }
      } catch {
        setError("Das Bild konnte nicht gelöscht werden.");
      }
    });
  }

  // Nur für Charaktere: das Portrait liegt in characters.portrait (Spalte,
  // kein content_images-Eintrag) und wird von CharacterPortrait.tsx als RSC-
  // Prop gerendert — router.refresh() holt diesen Server-Zustand nach dem
  // revalidateCharacter() in setCharacterPortraitAction frisch, ein reines
  // Client-State-Update hier würde die Portrait-Anzeige sonst nicht
  // erreichen.
  function handleSetPortrait(imageId: number) {
    startTransition(async () => {
      try {
        const result = await setCharacterPortraitAction(contentId, imageId);
        if (result.error) {
          setError(result.error);
        } else {
          setError(null);
          router.refresh();
        }
      } catch {
        setError("Das Profilbild konnte nicht gesetzt werden.");
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
        <ContentToolPreviewOverlay
          title="Bilder"
          onClose={() => setOpen(false)}
        >
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

          <p className="text-[13px]">
            Mehrere Bilder auf einmal möglich; jedes wird einzeln hochgeladen.
            Große Bilder werden vorher automatisch verkleinert (max.{" "}
            {formatMegabytes(MAX_UPLOAD_BYTES)} je Bild).
          </p>

          {images !== null && images.length > 0 && (
            <div className="flex flex-wrap gap-[10px]">
              {images.map((image) => (
                <div key={image.id} className="relative">
                  <Image
                    src={contentImageSrc(image.id)}
                    alt=""
                    width={100}
                    height={100}
                    unoptimized
                    className="size-[100px] object-cover rounded-[4px]"
                  />
                  {canManage && (
                    <div className="absolute top-[2px] right-[2px] flex gap-[4px]">
                      {contentType === "character" && (
                        <button
                          type="button"
                          onClick={() => handleSetPortrait(image.id)}
                          disabled={pending}
                          className="lcars-icon-btn size-[28px] disabled:opacity-50"
                          aria-label="Als Profilbild festlegen"
                          title="Als Profilbild festlegen"
                        >
                          <PortraitIcon />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(image.id)}
                        disabled={pending}
                        className="lcars-icon-btn lcars-icon-btn--danger size-[28px] disabled:opacity-50"
                        aria-label="Bild löschen"
                        title="Bild löschen"
                      >
                        <TrashIcon />
                      </button>
                    </div>
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
            <p className="text-lcars-quinary-ink text-[13px]" role="alert">
              {error}
            </p>
          )}
        </ContentToolPreviewOverlay>
      )}
    </>
  );
}
