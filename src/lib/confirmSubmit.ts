import type { MouseEvent } from "react";

// Bestätigungs-Dialog vor dem Absenden eines Formulars — bei Abbruch wird
// der Submit per preventDefault() verhindert. Gemeinsamer Helper statt des
// wortgleich kopierten onClick-Handlers in mehreren Confirm-vor-Submit-
// Buttons (ConfirmSubmitIconButton.tsx, DialogueMessageActions.tsx).
export function confirmSubmit(message: string) {
  return (e: MouseEvent<HTMLButtonElement>) => {
    if (!confirm(message)) {
      e.preventDefault();
    }
  };
}
