"use client";
import { useState } from "react";
import { useToast, type ToastKind } from "@/components/toast/ToastProvider";

// Admin-only (siehe scripts/page.tsx) — reines Test-/Vorschau-Werkzeug: löst
// einen Toast mit frei wählbarer Nachricht und wählbarem Status aus, um die
// farbliche Markierung (success = grün, warning = amber, error = rot, info)
// und das Stapel-/Ausblendverhalten zu prüfen. Kein Server-Effekt.
const KIND_OPTIONS: { value: ToastKind; label: string }[] = [
  { value: "success", label: "Success (grün)" },
  { value: "warning", label: "Warning (amber)" },
  { value: "error", label: "Error (rot)" },
  { value: "info", label: "Info" },
];

export default function ToastTestPanel() {
  const { showToast } = useToast();
  const [message, setMessage] = useState("Test-Benachrichtigung");
  const [kind, setKind] = useState<ToastKind>("success");

  return (
    <div className="lcars-text flex flex-col gap-[12px]">
      <p className="text-lcars-ink-dim text-[13px]">
        Löst einen Toast mit der eingegebenen Nachricht und dem gewählten Status
        aus — zum Prüfen der farblichen Markierung und des Stapelverhaltens.
      </p>

      <div className="flex flex-col gap-[6px]">
        <label className="lcars-eyebrow" htmlFor="toast-test-message">
          Nachricht
        </label>
        <input
          id="toast-test-message"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-lcars-pill lcars-input"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="lcars-eyebrow" htmlFor="toast-test-kind">
          Status
        </label>
        <select
          id="toast-test-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ToastKind)}
          className="lcars-input rounded-full self-start"
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() =>
          showToast(message.trim() || "Test-Benachrichtigung", { kind })
        }
        className="lcars-pill-btn--outline self-start"
      >
        Toast anzeigen
      </button>
    </div>
  );
}
