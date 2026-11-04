import { createContext, useContext, useId, type ReactNode } from "react";

const CharacterFieldLabelContext = createContext<string | undefined>(undefined);

export interface CharacterFormOption {
  value: string;
  label: string;
}

export function CharacterField({
  label,
  secondary,
  children,
  className = "",
}: {
  label: string;
  secondary?: string;
  children: ReactNode;
  className?: string;
}) {
  const labelId = `character-field-label-${useId()}`;
  return (
    <div className={`stat-editor-field ${className}`.trim()}>
      <span className="stat-field-label" id={labelId}>
        <span className="stat-label-primary">{label}</span>
        {secondary && <span className="stat-label-secondary">{secondary}</span>}
      </span>
      <CharacterFieldLabelContext.Provider value={labelId}>
        {children}
      </CharacterFieldLabelContext.Provider>
    </div>
  );
}

export function CharacterTextInput({
  id,
  list,
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
  type = "text",
}: {
  id?: string;
  list?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  type?: "text" | "search";
}) {
  const labelId = useContext(CharacterFieldLabelContext);
  return (
    <input
      id={id}
      list={list}
      name={name}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : labelId}
      className="stat-field-input"
      type={type}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
    />
  );
}

export function CharacterSelectInput({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "— auswählen —",
  disabled = false,
  includePlaceholder = true,
  className = "",
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly CharacterFormOption[];
  placeholder?: string;
  disabled?: boolean;
  includePlaceholder?: boolean;
  className?: string;
}) {
  const labelId = useContext(CharacterFieldLabelContext);
  return (
    <select
      id={id}
      name={name}
      aria-labelledby={labelId}
      className={`stat-field-input ${className}`.trim()}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {includePlaceholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CharacterTextField({
  label,
  secondary,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  secondary?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <CharacterField label={label} secondary={secondary}>
      <CharacterTextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </CharacterField>
  );
}

export function CharacterSelectField({
  id,
  label,
  secondary,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  legacyValue,
}: {
  id?: string;
  label: string;
  secondary?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly CharacterFormOption[];
  placeholder?: string;
  disabled?: boolean;
  legacyValue?: string | null;
}) {
  const choices = legacyValue && !options.some((option) => option.value === legacyValue)
    ? [{ value: legacyValue, label: `${legacyValue} (Alt-Eintrag)` }, ...options]
    : options;
  return (
    <CharacterField label={label} secondary={secondary}>
      <CharacterSelectInput
        id={id}
        value={value}
        onChange={onChange}
        options={choices}
        placeholder={placeholder}
        disabled={disabled}
      />
    </CharacterField>
  );
}
