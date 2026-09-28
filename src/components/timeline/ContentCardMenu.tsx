"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import ShareMenu from "@/components/ShareMenu";
import DeleteOwnContentButton from "@/app/user/content/DeleteOwnContentButton";
import { contentEditHref } from "@/lib/contentRoutes";
import {
  setContentStateAction,
  type VisibilityContentType,
} from "@/app/user/content/actions";

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

  return (
    <div className="timeline-card-actions">
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
          <ShareMenu title={title} href={href} menuItems />
          {isOwner && (
            <>
              <Link
                className="timeline-card-menu-link"
                href={contentEditHref(editType, id)}
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
