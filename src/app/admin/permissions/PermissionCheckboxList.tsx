"use client";

import { PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions";

// Gemeinsame Rechte-Checkbox-Liste für Anlegen/Bearbeiten einer Rolle. Gibt pro
// angehaktem Recht ein <input name="permissions"> mit dem Recht-Schlüssel ab.
export default function PermissionCheckboxList({
  selected,
  idPrefix,
}: {
  selected: string[];
  idPrefix: string;
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="flex flex-col gap-[6px]">
      {PERMISSIONS.map((perm) => (
        <label key={perm} className="flex items-start gap-[10px]">
          <input
            type="checkbox"
            name="permissions"
            value={perm}
            defaultChecked={selectedSet.has(perm)}
            id={`${idPrefix}-${perm}`}
            className="lcars-checkbox mt-[3px]"
          />
          <span className="flex flex-col">
            <span className="lcars-eyebrow">{PERMISSION_LABELS[perm].label}</span>
            <span className="text-lcars-ink-dim text-[12px]">
              {PERMISSION_LABELS[perm].description}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
