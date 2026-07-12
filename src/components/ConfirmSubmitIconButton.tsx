"use client";
import { useActionState } from "react";
import { FormError } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";

interface ConfirmSubmitState {
  error?: string;
}

// Gemeinsame Basis für CompleteDialogueButton/DeleteDialogueButton (und
// perspektivisch weitere "confirm() vor irreversibler Server Action"-Icon-
// Buttons): Formular mit einem versteckten entrySlug-Feld, ein Icon-Button,
// der vor dem Submit bestätigt werden muss, und die Fehleranzeige darunter.
export default function ConfirmSubmitIconButton({
  entrySlug,
  action,
  icon,
  label,
  confirmMessage,
  danger = false,
}: {
  entrySlug: string;
  action: (
    state: ConfirmSubmitState,
    formData: FormData,
  ) => Promise<ConfirmSubmitState>;
  icon: React.ReactNode;
  label: string;
  confirmMessage: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-[8px]">
      <input type="hidden" name="entrySlug" value={entrySlug} />
      <button
        type="submit"
        disabled={pending}
        className={`lcars-icon-btn${danger ? " lcars-icon-btn--danger" : ""} self-start disabled:opacity-50`}
        aria-label={label}
        title={label}
        onClick={confirmSubmit(confirmMessage)}
      >
        {icon}
      </button>
      <FormError message={state?.error} />
    </form>
  );
}
