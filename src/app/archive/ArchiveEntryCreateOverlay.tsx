"use client";

import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import NewArchiveEntryForm from "@/app/user/archive/new/NewArchiveEntryForm";
import { PlusIcon } from "@/lib/icons";
import type { ArchiveCategory } from "@/types/archive";

// Der vollständige Editor bleibt derselbe wie unter „Meine Inhalte". Das
// Overlay schafft nur einen kurzen Einstieg direkt aus der Datenbank; die
// Server-Action entscheidet weiterhin über Anmeldung und Berechtigung.
export default function ArchiveEntryCreateOverlay({
  userId,
  canAutoLink,
  initialCategory,
}: {
  userId: number;
  canAutoLink: boolean;
  initialCategory: Exclude<ArchiveCategory, "dialogue">;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="self-start">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-icon-btn"
        aria-label="Datenbank-Eintrag anlegen"
        title="Datenbank-Eintrag anlegen"
      >
        <PlusIcon />
      </button>

      {open && (
        <ModalOverlay
          title="Neuen Datenbank-Eintrag anlegen"
          onClose={() => setOpen(false)}
          width={960}
        >
          <NewArchiveEntryForm
            userId={userId}
            initialCategory={initialCategory}
            isAdminOrGM={canAutoLink}
          />
        </ModalOverlay>
      )}
    </div>
  );
}