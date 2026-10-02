import { describe, expect, it } from "vitest";
import { restoreEditorForm, serializeEditorForm } from "./editorDraftForm";

describe("editor form snapshots", () => {
  it("serializes named fields without hidden identity fields", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input type="hidden" name="entryId" value="42">
      <input name="title" value="Eintrag">
      <input name="isDraft" type="checkbox" checked>
      <select name="tags" multiple>
        <option value="alpha" selected>Alpha</option>
        <option value="beta">Beta</option>
      </select>
    `;

    expect(serializeEditorForm(form)).toEqual({
      title: "Eintrag",
      isDraft: true,
      tags: ["alpha"],
    });
  });

  it("restores text, checkboxes and multiselects and notifies local controls", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="title" value="Alt">
      <input name="isDraft" type="checkbox">
      <select name="participants" multiple>
        <option value="1">One</option>
        <option value="2">Two</option>
      </select>
    `;
    const checkbox = form.querySelector<HTMLInputElement>('input[name="isDraft"]')!;
    const participants = form.querySelector<HTMLSelectElement>('select[name="participants"]')!;
    let changes = 0;
    checkbox.addEventListener("change", () => changes++);
    participants.addEventListener("change", () => changes++);

    restoreEditorForm(form, {
      title: "Gesichert",
      isDraft: true,
      participants: ["2"],
    });

    expect(serializeEditorForm(form)).toEqual({
      title: "Gesichert",
      isDraft: true,
      participants: ["2"],
    });
    expect(changes).toBe(2);
  });
});
