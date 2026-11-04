import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HeadField } from "@/components/ContentEditor/headFields";
import CharacterHeadFieldRenderer from "./CharacterHeadFieldRenderer";

describe("CharacterHeadFieldRenderer", () => {
  it("uses the character-field layout for text, select, date, and number fields", () => {
    const fields: HeadField[] = [
      { kind: "text", name: "name", label: "Name", fullWidth: true },
      {
        kind: "select",
        name: "status",
        label: "Status",
        options: [{ value: "active", label: "Aktiv" }],
      },
      { kind: "date", name: "dateOfBirth", label: "Geburtsdatum" },
      { kind: "number", name: "age", label: "Alter", min: 0 },
    ];
    const { container } = render(
      <>
        {fields.map((field) => (
          <CharacterHeadFieldRenderer
            key={field.name}
            field={field}
            idPrefix="test"
            defaultValue={field.name === "status" ? "active" : undefined}
          />
        ))}
      </>,
    );

    const wrappers = [...container.querySelectorAll(".stat-editor-field")];
    expect(wrappers).toHaveLength(fields.length);
    for (const wrapper of wrappers) {
      expect(wrapper.querySelector(".stat-field-input")).not.toBeNull();
      expect(wrapper.querySelector(".stat-field-label")).not.toBeNull();
    }
    expect(wrappers[0]).toHaveClass("content-editor-field--full");
    expect(container.querySelector('[name="status"]')).toHaveValue("active");
    expect(container.querySelector('[name="age"]')).toHaveAttribute("min", "0");
  });
});
