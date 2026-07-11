import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/archiveFormat";
import type { ArchiveCategory } from "@/types/archive";
import type { HeadField } from "@/components/ContentEditor/headFields";

// Kategorie 'dialogue' bewusst ausgeschlossen — Gespräche haben ihr eigenes
// Anlage-/Bearbeiten-Formular (/user/dialogues/new) mit eigenem
// Daten-/Teilnehmer-Modell statt eines freien Markdown-Bodys.
const SELECTABLE_CATEGORIES = CATEGORY_ORDER.filter(
  (c) => c !== "dialogue",
) as Exclude<ArchiveCategory, "dialogue">[];

export const archiveEntryHeadFields: HeadField[] = [
  {
    kind: "text",
    name: "title",
    label: "Titel",
    required: true,
    fullWidth: true,
  },
  {
    kind: "select",
    name: "category",
    label: "Archiv-Kategorie",
    options: SELECTABLE_CATEGORIES.map((c) => ({
      value: c,
      label: CATEGORY_CONFIG[c].label,
    })),
  },
  {
    kind: "text",
    name: "tags",
    label: "Tags (kommagetrennt)",
  },
];
