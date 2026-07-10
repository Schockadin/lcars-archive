import type { HeadField } from "@/components/ContentEditor/headFields";

export const missionLogHeadFields: HeadField[] = [
  { kind: "text", name: "title", label: "Titel", required: true, fullWidth: true },
  {
    kind: "number",
    name: "sessionNr",
    label: "Session-Nr.",
    required: true,
    min: 1,
    showIf: ({ mode }) => mode === "create",
  },
  { kind: "date", name: "logDate", label: "Datum" },
];

export const missionLogMetadataFields: HeadField[] = [
  { kind: "text", name: "tags", label: "Tags (kommagetrennt)" },
];
