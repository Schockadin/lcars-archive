"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import ShareMenu from "@/components/ShareMenu";
import DeleteOwnContentButton from "@/app/user/content/DeleteOwnContentButton";
import { contentEditHref } from "@/lib/contentRoutes";
import {
  setContentStateAction,
  type VisibilityContentType,
} from "@/app/user/content/actions";
import type { ExportContentType } from "@/lib/contentExport";

type CardContentType = VisibilityContentType;

export default function ContentCardMenu({
  contentType,
  id,
  ownerUserId,
  currentUserId,
  isDraft,
  title,
  href,
}: {
  contentType: CardContentType;
  id: number;
  ownerUserId: number | null;
  currentUserId: number | null;
  isDraft: boolean;
  title: string;
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isOwner = currentUserId != null && ownerUserId === currentUserId;
  const [pending, startTransition] = useTransition();
  const editType =
    contentType === "mission_log"
      ? "missionLog"
      : contentType === "archive_entry" || contentType === "dialogue"
        ? "archiveEntry"
        : contentType;
  const visibilityType: VisibilityContentType | null = contentType;
  const exportType: ExportContentType =
    contentType === "dialogue" ? "archive_entry" : contentType;
  const exportSlug = decodeURIComponent(
    href.split(/[?#]/, 1)[0].split("/").filter(Boolean).at(-1) ?? "",
  );

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={open ? "timeline-card-actions timeline-card-actions--open" : "timeline-card-actions"}
    >
      <button
        type="button"
        className="timeline-card-more"
        aria-label="Weitere Aktionen"
        title="Weitere Aktionen"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open && (
        <div className="timeline-card-menu" role="menu" aria-label="Aktionen">
          <ShareMenu
            title={title}
            href={href}
            exportType={exportType}
            exportSlug={exportSlug}
            menuItems
          />
          {isOwner && (
            <>
              <Link
                className="timeline-card-menu-link"
                href={contentEditHref(editType, id, exportSlug)}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Bearbeiten
              </Link>
              {visibilityType && (
                <button
                  type="button"
                  role="menuitem"
                  className="timeline-card-menu-link"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await setContentStateAction(
                        visibilityType,
                        id,
                        isDraft ? "published" : "draft",
                      );
                      if (result.error) setActionError(result.error);
                      else setOpen(false);
                    });
                  }}
                >
                  {isDraft ? "Veröffentlichen" : "Als Entwurf"}
                </button>
              )}
              <DeleteOwnContentButton
                contentType={contentType}
                id={id}
                onOptimisticDelete={() => {}}
                textAction
              />
            </>
          )}
          {actionError && <p className="px-[10px] text-[12px] text-lcars-quinary-ink" role="alert">{actionError}</p>}
        </div>
      )}
    </div>
  );
}
