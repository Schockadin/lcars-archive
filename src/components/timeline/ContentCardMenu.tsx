"use client";
import { useState } from "react";
import Link from "next/link";
import ShareMenu from "@/components/ShareMenu";
import ContentStateSelect from "@/app/user/content/ContentStateSelect";
import DeleteOwnContentButton from "@/app/user/content/DeleteOwnContentButton";
import { contentEditHref } from "@/lib/contentRoutes";
import type { VisibilityContentType } from "@/app/user/content/actions";

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
  const isOwner = currentUserId != null && ownerUserId === currentUserId;
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
        className="lcars-icon-btn timeline-card-more"
        aria-label="Weitere Aktionen"
        title="Weitere Aktionen"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div className="timeline-card-menu" role="group" aria-label="Aktionen">
          <ShareMenu title={title} href={href} />
          {isOwner && (
            <>
              <Link
                className="timeline-card-menu-link"
                href={contentEditHref(editType, id)}
                onClick={() => setOpen(false)}
              >
                Bearbeiten
              </Link>
              {visibilityType && (
                <ContentStateSelect
                  contentType={visibilityType}
                  id={id}
                  isDraft={isDraft}
                />
              )}
              <DeleteOwnContentButton
                contentType={contentType}
                id={id}
                onOptimisticDelete={() => {}}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
