import type { HeadField } from "@/components/ContentEditor/headFields";
import { CHARACTER_STATUS_OPTIONS } from "@/lib/characterFormat";

const STATUS_OPTIONS = [...CHARACTER_STATUS_OPTIONS];

export const characterHeadFields: HeadField[] = [
  {
    kind: "text",
    name: "name",
    label: "Name",
    required: true,
    fullWidth: true,
  },
  { kind: "select", name: "status", label: "Status", options: STATUS_OPTIONS },
  // Portrait steht NICHT in dieser Liste: Beim Anlegen hat es im Wizard einen
  // eigenen Editor, danach ein eigenes Panel. Beide verwenden PortraitPicker
  // und den gemeinsamen readCharacterPortrait-Parser.
  { kind: "text", name: "species", label: "Spezies (kommagetrennt)" },
  { kind: "text", name: "rank", label: "Rang (optional)" },
  { kind: "text", name: "homeworld", label: "Heimatwelt (optional)" },
  { kind: "text", name: "aliases", label: "Aliase (kommagetrennt)" },
];

export const characterMetadataFields: HeadField[] = [
  {
    kind: "date",
    name: "dateOfBirth",
    label: "Geburtsdatum",
    hint: "Ist es gesetzt, wird das Alter automatisch aus dem aktuellen Ingame-Jahr berechnet (siehe Kampagne).",
  },
  {
    kind: "number",
    name: "age",
    label: "Alter (nur ohne Geburtsdatum)",
    min: 0,
  },
  { kind: "text", name: "generation", label: "Generation (kommagetrennt)" },
  { kind: "text", name: "factions", label: "Fraktionen (kommagetrennt)" },
  { kind: "text", name: "ships", label: "Schiffe (kommagetrennt)" },
  { kind: "text", name: "division", label: "Division" },
  { kind: "text", name: "tags", label: "Tags (kommagetrennt)" },
];
