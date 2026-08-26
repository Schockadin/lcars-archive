"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { deleteContentImageAdminAction } from "./actions";
import type { AdminContentImage, ContentImageType } from "@/lib/contentImages";
import { formatDateTime } from "@/utils/formateISODate";
import { TrashIcon } from "@/lib/icons";

const CONTENT_TYPE_LABEL: Record<ContentImageType, string> = {
  character: "Charakter",
  mission: "Mission",
  mission_log: "Missionslog",
  archive_entry: "Archiv-Eintrag",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// Thumbnail-Grid statt der tabellarischen AdminLogTable (siehe /admin/
// audit-log) — Bilder sind der eigentliche Inhalt hier, eine reine
// Text-Tabelle würde die Vorschau (der explizit gewünschte Teil dieser
// Seite) nur als winzige Extra-Spalte behandeln.
export default function ImagesAdminGrid({
  images,
}: {
  images: AdminContentImage[];
}) {
  const [items, setItems] = useState(images);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: number) {
    if (!window.confirm("Dieses Bild endgültig aus dem Bucket löschen?"))
      return;
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteContentImageAdminAction(id);
      setPendingId(null);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setItems((prev) => prev.filter((image) => image.id !== id));
      }
    });
  }

  if (items.length === 0) {
    return <p className="lcars-empty-state">Keine Bilder vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {error && (
        <p className="text-lcars-quinary text-[13px]" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-[12px]">
        {items.map((image) => (
          <div
            key={image.id}
            className="flex flex-col gap-[6px] rounded-lcars-pill bg-lcars-surface p-[8px]"
          >
            <Image
              src={`/api/content-images/${image.id}`}
              alt=""
              width={140}
              height={140}
              unoptimized
              className="size-[140px] object-cover rounded-[4px]"
            />
            <p className="text-[11px] uppercase tracking-[.1em] text-lcars-ink">
              {CONTENT_TYPE_LABEL[image.contentType]}
            </p>
            {image.contentTitle && image.contentHref ? (
              <Link
                href={image.contentHref}
                className="text-[13px] underline truncate"
              >
                {image.contentTitle}
              </Link>
            ) : (
              <p className="text-[13px] text-lcars-ink">
                Verwaist (Inhalt gelöscht)
              </p>
            )}
            <p className="text-[11px] text-lcars-ink">
              {image.uploadedByName ?? "Unbekannt"} ·{" "}
              {formatDateTime(image.createdAt)}
            </p>
            <p className="text-[11px] text-lcars-ink">
              {formatSize(image.sizeBytes)}
            </p>
            <button
              type="button"
              onClick={() => handleDelete(image.id)}
              disabled={pendingId === image.id}
              className="lcars-icon-btn lcars-icon-btn--danger self-end disabled:opacity-50"
              aria-label="Bild löschen"
              title="Bild löschen"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
