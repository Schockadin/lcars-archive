import type { HeadField } from "@/components/ContentEditor/headFields";

export const missionLogHeadFields = [
  {
    kind: "text",
    name: "title",
    label: "Titel",
    required: true,
    fullWidth: true,
  },
  {
    kind: "number",
    name: "sessionNr",
    label: "Session-Nr.",
    required: true,
    min: 1,
    showIf: ({ mode }) => mode === "create",
  },
  { kind: "date", name: "logDate", label: "Datum" },
] as const satisfies readonly HeadField[];

export const missionLogMetadataFields = [
  { kind: "text", name: "tags", label: "Tags (kommagetrennt)" },
] as const satisfies readonly HeadField[];
