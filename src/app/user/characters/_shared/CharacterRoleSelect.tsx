"use client";

import { useState } from "react";
import { ROLE_OPTIONS, findRoleOption } from "@/lib/sta2eCharacterOptions";

export default function CharacterRoleSelect({
  id,
  name = "characterRole",
  value,
  onChange,
}: {
  id: string;
  name?: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [customMode, setCustomMode] = useState(
    Boolean(value && !findRoleOption(value)),
  );
  const selectedRole = findRoleOption(value);
  const isCustom = customMode || Boolean(value && !selectedRole);

  return (
    <div className="stat-editor-field">
      <label htmlFor={id} className="stat-field-label">
        <span className="stat-label-primary">Character Role</span>
        <span className="stat-label-secondary">Rolle</span>
      </label>
      <select
        id={id}
        name={isCustom ? undefined : name}
        value={isCustom ? "__custom__" : selectedRole?.name ?? ""}
        onChange={(event) => {
          if (event.currentTarget.value === "__custom__") {
            setCustomMode(true);
            onChange(value ?? null);
            return;
          }
          setCustomMode(false);
          onChange(event.currentTarget.value || null);
        }}
        className="stat-field-input"
      >
        <option value="">— keine Angabe —</option>
        {ROLE_OPTIONS.map((role) => (
          <option key={role.id} value={role.name}>{role.label}</option>
        ))}
        <option value="__custom__">Andere oder Modulrolle …</option>
      </select>
      {isCustom && (
        <input
          type="text"
          name={isCustom ? name : undefined}
          aria-label="Eigene Rolle oder Modulrolle"
          placeholder="z. B. Technomage"
          value={value ?? ""}
          onChange={(event) => onChange(event.currentTarget.value || null)}
          className="stat-field-input"
        />
      )}
    </div>
  );
}
