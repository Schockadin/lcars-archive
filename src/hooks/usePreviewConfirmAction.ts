"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContentToolType } from "@/app/actions/contentTools";

// Gemeinsames Vorschau-vor-Speichern-Muster für die Admin-Content-Tools auf
// den vier Inhalts-Detailseiten (ContentLinkToolButton, Autolink- wie
// Delink-Modus):
// Preview laden, anzeigen, erst nach explizitem Bestätigen tatsächlich
// speichern (kein Blind-Apply) — statt derselben preview/error/applied/
// pending-State-Maschine in jeder Button-Komponente neu zu schreiben.
export function usePreviewConfirmAction<
  TPreview extends object,
  TApplyResult extends object,
>(
  contentType: ContentToolType,
  slug: string,
  previewAction: (
    contentType: ContentToolType,
    slug: string,
  ) => Promise<TPreview | { error: string }>,
  applyAction: (
    contentType: ContentToolType,
    slug: string,
  ) => Promise<TApplyResult | { error: string }>,
  formatApplied: (result: TApplyResult) => string,
) {
  const router = useRouter();
  const [preview, setPreview] = useState<TPreview | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [applied, setApplied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePreview() {
    setError(undefined);
    setApplied(null);
    startTransition(async () => {
      const result = await previewAction(contentType, slug);
      if ("error" in result) setError(result.error);
      else setPreview(result);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await applyAction(contentType, slug);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPreview(null);
      setApplied(formatApplied(result));
      router.refresh();
    });
  }

  function handleCancel() {
    setPreview(null);
  }

  return { preview, error, applied, pending, handlePreview, handleConfirm, handleCancel };
}
