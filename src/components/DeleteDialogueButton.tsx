"use client";
import { deleteDialogueAction } from "@/app/actions/dialogues";
import { TrashIcon } from "@/lib/icons";
import ConfirmSubmitIconButton from "./ConfirmSubmitIconButton";

// Admin-only (siehe Sichtbarkeits-Gate in den beiden aufrufenden Pages) —
// unwiderruflich, daher confirm() vor dem Submit wie bei
// CompleteDialogueButton.tsx.
export default function DeleteDialogueButton({
  entrySlug,
}: {
  entrySlug: string;
}) {
  return (
    <ConfirmSubmitIconButton
      entrySlug={entrySlug}
      action={deleteDialogueAction}
      icon={<TrashIcon />}
      label="Gespräch löschen"
      confirmMessage="Dieses Gespräch wirklich endgültig löschen? Beide beteiligten Spieler werden per Mail informiert — das lässt sich nicht rückgängig machen."
      danger
    />
  );
}
