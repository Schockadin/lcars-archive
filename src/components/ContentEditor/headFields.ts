import type { ReactNode } from "react";

interface HeadFieldOption {
  value: string;
  label: string;
}

interface HeadFieldBase<Name extends string> {
  // FormData-Feldname.
  name: Name;
  label: string;
  hint?: ReactNode;
  required?: boolean;
  // true → volle Breite im Grid (z.B. Titel/Name), sonst halbe Breite.
  fullWidth?: boolean;
  // z.B. Mission-Slug/Mission-Log-Session-Nr, die nur beim Anlegen sichtbar sind.
  showIf?: (ctx: { mode: "create" | "edit" }) => boolean;
}

export type HeadField<Name extends string = string> =
  | (HeadFieldBase<Name> & { kind: "text"; placeholder?: string })
  | (HeadFieldBase<Name> & { kind: "select"; options: HeadFieldOption[] })
  | (HeadFieldBase<Name> & { kind: "date" })
  | (HeadFieldBase<Name> & { kind: "number"; min?: number })
  // Datei-Upload (z.B. Portrait-Bild bei der Charakter-Anlage). Kein
  // defaultValue (File-Inputs sind immer uncontrolled); accept begrenzt die
  // im Dateidialog auswählbaren Typen (serverseitige Prüfung bleibt maßgeblich).
  | (HeadFieldBase<Name> & { kind: "file"; accept?: string });
