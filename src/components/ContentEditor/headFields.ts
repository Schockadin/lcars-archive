import type { ReactNode } from "react";

interface HeadFieldOption {
  value: string;
  label: string;
}

interface HeadFieldBase {
  // FormData-Feldname.
  name: string;
  label: string;
  hint?: ReactNode;
  required?: boolean;
  // true → volle Breite im Grid (z.B. Titel/Name), sonst halbe Breite.
  fullWidth?: boolean;
  // z.B. Mission-Slug/Mission-Log-Session-Nr, die nur beim Anlegen sichtbar sind.
  showIf?: (ctx: { mode: "create" | "edit" }) => boolean;
}

export type HeadField =
  | (HeadFieldBase & { kind: "text"; placeholder?: string })
  | (HeadFieldBase & { kind: "select"; options: HeadFieldOption[] })
  | (HeadFieldBase & { kind: "date" })
  | (HeadFieldBase & { kind: "number"; min?: number });
