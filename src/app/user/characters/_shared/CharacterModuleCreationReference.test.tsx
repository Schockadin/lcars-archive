import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import CharacterModuleCreationReference from "./CharacterModuleCreationReference";

const definition: RuleModuleDefinition = {
  id: "example",
  name: "Example",
  summary: "",
  characterRoles: ["*"],
  rules: [],
  resources: [{ id: "charge", name: "Charge", abbreviation: "CH", maximum: "6" }],
  statuses: [{ id: "attuned", label: "Attuned" }],
  talents: [],
  prestigeClasses: [],
  collections: [{
    id: "forms",
    title: "Forms",
    description: "",
    fields: [],
    entries: [{ id: "quick", name: "Quick", values: {} }],
  }],
  schools: [],
  spells: [],
  characterTab: { enabled: true, label: "Example" },
};

describe("CharacterModuleCreationReference", () => {
  it("edits module resources, statuses, and collection choices before creation", () => {
    const onChange = vi.fn();
    render(
      <CharacterModuleCreationReference
        definition={definition}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Charge/), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ resources: { charge: 3 } }));

    fireEvent.click(screen.getByLabelText("Attuned"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ selectedStatuses: ["attuned"] }));

    fireEvent.click(screen.getByLabelText("Quick"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ selectedCollectionEntries: { forms: ["quick"] } }));
  });
});
