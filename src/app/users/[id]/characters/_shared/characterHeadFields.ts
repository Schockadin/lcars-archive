import type { HeadField } from "@/components/ContentEditor/headFields";

const STATUS_OPTIONS = [
  { value: "active", label: "Aktiv" },
  { value: "retired", label: "Inaktiv" },
  { value: "deceased", label: "Verstorben" },
];

export const characterHeadFields: HeadField[] = [
  { kind: "text", name: "name", label: "Name", required: true, fullWidth: true },
  { kind: "select", name: "status", label: "Status", options: STATUS_OPTIONS },
  { kind: "text", name: "portrait", label: "Portrait-URL (optional)" },
  { kind: "text", name: "species", label: "Spezies (kommagetrennt)" },
  { kind: "text", name: "rank", label: "Rang (optional)" },
  { kind: "text", name: "homeworld", label: "Heimatwelt (optional)" },
  { kind: "text", name: "aliases", label: "Aliase (kommagetrennt)" },
];

export const characterMetadataFields: HeadField[] = [
  { kind: "number", name: "age", label: "Alter", min: 0 },
  { kind: "text", name: "generation", label: "Generation (kommagetrennt)" },
  { kind: "text", name: "factions", label: "Fraktionen (kommagetrennt)" },
  { kind: "text", name: "ships", label: "Schiffe (kommagetrennt)" },
  { kind: "text", name: "division", label: "Division" },
  { kind: "text", name: "tags", label: "Tags (kommagetrennt)" },
];
