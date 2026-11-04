"use client";

import { useState } from "react";
import { ROLE_OPTIONS, findRoleOption } from "@/lib/sta2eCharacterOptions";
import { CharacterField, CharacterSelectInput, CharacterTextInput } from "./CharacterFormControls";

export default function CharacterRoleSelect({
  id,
  name = "characterRole",
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  name?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const [customMode, setCustomMode] = useState(
    Boolean(value && !findRoleOption(value)),
  );
  const selectedRole = findRoleOption(value);
  const isCustom = customMode || Boolean(value && !selectedRole);

  return (
    <CharacterField label="Character Role" secondary="Rolle">
      <CharacterSelectInput
        id={id}
        name={isCustom ? undefined : name}
        disabled={disabled}
        value={isCustom ? "__custom__" : selectedRole?.name ?? ""}
        onChange={(next) => {
          if (next === "__custom__") {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next || null);
        }}
        options={[
          ...ROLE_OPTIONS.map((role) => ({ value: role.name, label: role.label })),
          { value: "__custom__", label: "Andere oder Modulrolle …" },
        ]}
        placeholder="— keine Angabe —"
      />
      {disabled && <input type="hidden" name={name} value={value ?? ""} />}
      {isCustom && (
        <CharacterTextInput
          name={name}
          ariaLabel="Eigene Rolle oder Modulrolle"
          placeholder="z. B. Technomage"
          value={value ?? ""}
          disabled={disabled}
          onChange={(next) => onChange(next || null)}
        />
      )}
    </CharacterField>
  );
}
