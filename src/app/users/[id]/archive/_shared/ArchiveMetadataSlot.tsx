"use client";
import { useEffect, useState } from "react";
import MetadataSection from "@/components/ContentEditor/MetadataSection";
import HeadFieldRenderer from "@/components/ContentEditor/HeadFieldRenderer";
import {
  getAttributeFields,
  getReferenceFields,
} from "@/lib/archiveMetadataFields";
import type { ArchiveCategory } from "@/types/archive";

// Metadaten-Sektion für Archiv-Einträge — reagiert live auf die gewählte
// Kategorie (das Kategorie-<select> lebt als normales Head-Feld daneben,
// bleibt aber unkontrolliert wie der Rest der App; hier nur per onChange
// mitgelesen, um zu wissen, welche Attribut-/Verweisfelder gerade gelten).
export default function ArchiveMetadataSlot({
  idPrefix,
  categorySelectId,
  initialCategory,
  summaryDefault,
  attributeDefaults = {},
  referenceDefaults = {},
}: {
  idPrefix: string;
  categorySelectId: string;
  initialCategory: Exclude<ArchiveCategory, "dialogue">;
  summaryDefault?: string;
  attributeDefaults?: Record<string, string>;
  referenceDefaults?: Record<string, string>;
}) {
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    const select = document.getElementById(categorySelectId) as HTMLSelectElement | null;
    if (!select) return;
    const onChange = () => setCategory(select.value as Exclude<ArchiveCategory, "dialogue">);
    select.addEventListener("change", onChange);
    return () => select.removeEventListener("change", onChange);
  }, [categorySelectId]);

  const attributeFields = getAttributeFields(category);
  const referenceFields = getReferenceFields(category);

  return (
    <MetadataSection>
      <HeadFieldRenderer
        field={{ kind: "text", name: "summary", label: "Teaser", fullWidth: true }}
        idPrefix={idPrefix}
        defaultValue={summaryDefault}
      />
      {attributeFields.map((field) => (
        <HeadFieldRenderer
          key={field.key}
          field={{ kind: "text", name: field.key, label: field.label }}
          idPrefix={idPrefix}
          defaultValue={attributeDefaults[field.key]}
        />
      ))}
      {referenceFields.map((field) => (
        <HeadFieldRenderer
          key={field.key}
          field={{
            kind: "text",
            name: field.key,
            label: `${field.label} (kommagetrennte Slugs)`,
          }}
          idPrefix={idPrefix}
          defaultValue={referenceDefaults[field.key]}
        />
      ))}
    </MetadataSection>
  );
}
