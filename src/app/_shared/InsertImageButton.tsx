"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getContentImagesAction } from "@/app/actions/contentImages";
import { insertAtCursor } from "@/lib/textareaEdit";
import ContentToolPreviewOverlay from "@/components/ContentToolPreviewOverlay";
import type { ContentImage, ContentImageType } from "@/lib/contentImages";
import { ImageIcon } from "@/lib/icons";

// Toolbar-Werkzeug in MarkdownEditor.tsx (analog TimelineMarkerButton.tsx):
// fügt eines der bereits über ContentImageGallery.tsx (ActionsMenu.tsx)
// hochgeladenen Bilder als Markdown-Bild an der Cursor-Position ein. Nur für
// bereits existierende Inhalte sinnvoll (contentId bekannt) — Charaktere
// bewusst ausgenommen (siehe MarkdownEditor.tsx-Prop insertImage): dort gibt
// es stattdessen Portrait-Auswahl + Karussell (CharacterPortrait.tsx).
export default function InsertImageButton({
  textareaId,
  contentType,
  contentId,
}: {
  textareaId: string;
  contentType: ContentImageType;
  contentId: number;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ContentImage[] | null>(null);

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

  function handleInsert(imageId: number) {
    const textarea = document.getElementById(textareaId);
    if (textarea instanceof HTMLTextAreaElement) {
      insertAtCursor(textarea, `![Bild](/api/content-images/${imageId})`, {
        ownLine: true,
      });
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

          {images === null && <p className="text-[13px]">Lädt…</p>}

          {images !== null && images.length === 0 && (
            <p className="text-[13px]">
              Noch keine Bilder hochgeladen. Lade zuerst welche über den
              Bilder-Button hoch.
            </p>
          )}

          {images !== null && images.length > 0 && (
            <div className="flex flex-wrap gap-[10px]">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => handleInsert(image.id)}
                  className="cursor-pointer"
                  aria-label="Dieses Bild einfügen"
                  title="Dieses Bild einfügen"
                >
                  <Image
                    src={`/api/content-images/${image.id}`}
                    alt=""
                    width={100}
                    height={100}
                    unoptimized
                    className="size-[100px] object-cover rounded-[4px]"
                  />
                </button>
              ))}
            </div>
          )}
        </ContentToolPreviewOverlay>
      )}
    </>
  );
}
