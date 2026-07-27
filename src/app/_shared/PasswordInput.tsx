"use client";
import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/lib/icons";

// Passwort-Eingabefeld mit Sichtbarkeits-Umschalter (Auge-Icon). Nimmt alle
// üblichen <input>-Props entgegen (id, name, required, autoComplete,
// minLength, className …) und setzt `type` selbst je nach Sichtbarkeit. Der
// Umschalter sitzt rechts im Feld (siehe .password-input-wrap in shared.css,
// die das rechte Innen-Padding des Feldes bereitstellt).
export default function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input-wrap">
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
