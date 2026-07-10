import type { HeadField } from "@/components/ContentEditor/headFields";

const STATUS_OPTIONS = [
  { value: "active", label: "Aktiv" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "failed", label: "Gescheitert" },
  { value: "abandoned", label: "Abgebrochen" },
];

export const missionHeadFields: HeadField[] = [
  { kind: "text", name: "title", label: "Titel", required: true, fullWidth: true },
  {
    kind: "text",
    name: "slug",
    label: "Slug (optional)",
    hint: "Bestimmt die URL der Mission. Bleibt das Feld leer, wird der Slug aus dem Titel abgeleitet.",
    fullWidth: true,
    showIf: ({ mode }) => mode === "create",
  },
  { kind: "select", name: "status", label: "Status", options: STATUS_OPTIONS },
  { kind: "date", name: "startedAt", label: "Start" },
  { kind: "date", name: "endedAt", label: "Ende (optional)" },
  { kind: "text", name: "tags", label: "Tags (kommagetrennt)" },
];
