import type { EditorDraftFields } from "./editorDraftTypes";

type FormFieldControl =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

function namedControls(form: HTMLFormElement): Map<string, FormFieldControl[]> {
  const grouped = new Map<string, FormFieldControl[]>();
  for (const control of Array.from(form.elements)) {
    if (
      !(control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement) ||
      !control.name ||
      control.disabled ||
      control.closest("[data-no-draft]")
    ) {
      continue;
    }
    if (control instanceof HTMLInputElement) {
      if (["hidden", "file", "submit", "reset", "button", "image"].includes(control.type)) {
        continue;
      }
    }
    const controls = grouped.get(control.name) ?? [];
    controls.push(control);
    grouped.set(control.name, controls);
  }
  return grouped;
}

function isCheckbox(control: FormFieldControl): control is HTMLInputElement {
  return control instanceof HTMLInputElement && control.type === "checkbox";
}

function isRadio(control: FormFieldControl): control is HTMLInputElement {
  return control instanceof HTMLInputElement && control.type === "radio";
}

export function serializeEditorForm(form: HTMLFormElement): EditorDraftFields {
  const fields: EditorDraftFields = {};
  for (const [name, controls] of namedControls(form)) {
    const first = controls[0];
    if (first instanceof HTMLSelectElement && first.multiple) {
      fields[name] = Array.from(first.selectedOptions, (option) => option.value);
    } else if (controls.every(isCheckbox)) {
      fields[name] =
        controls.length === 1
          ? controls[0].checked
          : controls.filter((control) => control.checked).map((control) => control.value);
    } else if (controls.every(isRadio)) {
      fields[name] = controls.find((control) => control.checked)?.value ?? "";
    } else if (first instanceof HTMLSelectElement) {
      fields[name] = first.value;
    } else {
      fields[name] = (first as HTMLInputElement | HTMLTextAreaElement).value;
    }
  }
  return fields;
}

function setValue(control: FormFieldControl, value: string): boolean {
  if (control.value === value) return false;
  const prototype = Object.getPrototypeOf(control) as object;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor?.set) descriptor.set.call(control, value);
  else control.value = value;
  return true;
}

function setChecked(control: HTMLInputElement, checked: boolean): boolean {
  if (control.checked === checked) return false;
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(control) as object,
    "checked",
  );
  if (descriptor?.set) descriptor.set.call(control, checked);
  else control.checked = checked;
  return true;
}

function dispatchFieldEvent(control: FormFieldControl): void {
  const type = control instanceof HTMLInputElement && control.type === "text"
    ? "input"
    : control instanceof HTMLTextAreaElement ||
        (control instanceof HTMLInputElement &&
          !["checkbox", "radio"].includes(control.type))
      ? "input"
      : "change";
  control.dispatchEvent(new Event(type, { bubbles: true }));
}

export function restoreEditorForm(
  form: HTMLFormElement,
  fields: EditorDraftFields,
): void {
  const grouped = namedControls(form);
  for (const [name, savedValue] of Object.entries(fields)) {
    const controls = grouped.get(name);
    if (!controls?.length) continue;
    const first = controls[0];
    let changed = false;

    if (first instanceof HTMLSelectElement && first.multiple && Array.isArray(savedValue)) {
      const selected = new Set(savedValue);
      for (const option of Array.from(first.options)) {
        option.selected = selected.has(option.value);
      }
      changed = true;
    } else if (controls.every(isCheckbox)) {
      if (typeof savedValue === "boolean" && controls.length === 1) {
        changed = setChecked(controls[0], savedValue);
      } else if (Array.isArray(savedValue)) {
        const selected = new Set(savedValue);
        for (const control of controls) {
          changed = setChecked(control, selected.has(control.value)) || changed;
        }
      }
    } else if (controls.every(isRadio)) {
      if (typeof savedValue === "string") {
        for (const control of controls) {
          changed = setChecked(control, control.value === savedValue) || changed;
        }
      }
    } else if (typeof savedValue === "string") {
      changed = setValue(first, savedValue);
    }

    if (changed) dispatchFieldEvent(first);
  }
}
