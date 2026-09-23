"use client";

import type { ComponentPropsWithoutRef } from "react";

// Explizite Formulargrenze für die globale sessionStorage-Sicherung. Der
// Scope ist Teil des Komponentenvertrags und kann beim Bearbeiten deshalb
// nicht versehentlich ohne Inhalts-ID bleiben.
export default function SessionDraftForm({
  draftScope,
  children,
  ...formProps
}: ComponentPropsWithoutRef<"form"> & { draftScope: string }) {
  if (!draftScope.trim()) {
    throw new Error("SessionDraftForm benötigt einen stabilen draftScope.");
  }

  return (
    <form {...formProps} data-draft-scope={draftScope}>
      {children}
    </form>
  );
}
