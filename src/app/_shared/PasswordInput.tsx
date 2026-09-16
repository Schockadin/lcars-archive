"use client";
import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/lib/icons";

// Passwort-Eingabefeld mit Sichtbarkeits-Umschalter (Auge-Icon). Nimmt alle
// üblichen <input>-Props entgegen (id, name, required, autoComplete,
// minLength, className …) und setzt `type` selbst je nach Sichtbarkeit. Der
// Umschalter sitzt rechts im Feld (siehe .password-input-wrap in shared.css,
// die das rechte Innen-Padding des Feldes bereitstellt).
//
// data-no-draft am Rahmen: Passwörter gehören nie in die Entwurfs-Sicherung
// (siehe src/lib/inputDraft.ts). Das Attribut ist hier nötig, weil das Feld
// bei sichtbarem Passwort type="text" trägt — die Typ-Prüfung allein würde
// es dann durchlassen.
export default function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input-wrap" data-no-draft>
      <input
        {...props}
        type={show ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
        title={show ? "Verbergen" : "Anzeigen"}
        aria-pressed={show}
        tabIndex={-1}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
