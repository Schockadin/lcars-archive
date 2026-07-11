"use client";
import { completeDialogueAction } from "@/app/actions/dialogues";
import { CheckIcon } from "@/lib/icons";
import ConfirmSubmitIconButton from "./ConfirmSubmitIconButton";

// Abschließen ist one-way (siehe completeDialogue in dialoguesCore.ts) —
// daher confirm() vor dem Submit, um versehentliche Klicks abzufangen.
export default function CompleteDialogueButton({
  entrySlug,
}: {
  entrySlug: string;
}) {
  return (
    <ConfirmSubmitIconButton
      entrySlug={entrySlug}
      action={completeDialogueAction}
      icon={<CheckIcon />}
      label="Gespräch beenden"
      confirmMessage="Dieses Gespräch wirklich abschließen? Das lässt sich nicht rückgängig machen."
    />
  );
}
