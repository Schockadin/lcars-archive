import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CharacterRoleSelect from "./CharacterRoleSelect";

describe("CharacterRoleSelect", () => {
  it("selects a standard STA-2e role", () => {
    const onChange = vi.fn();
    render(<CharacterRoleSelect id="role" value={null} onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Communications Officer" },
    });

    expect(onChange).toHaveBeenCalledWith("Communications Officer");
  });

  it("keeps module-specific roles editable", () => {
    const onChange = vi.fn();
    render(<CharacterRoleSelect id="role" value="Technomage" onChange={onChange} />);

    expect(screen.getByLabelText("Eigene Rolle oder Modulrolle")).toHaveValue("Technomage");
    fireEvent.change(screen.getByLabelText("Eigene Rolle oder Modulrolle"), {
      target: { value: "Chronomancer" },
    });
    expect(onChange).toHaveBeenCalledWith("Chronomancer");
  });
});
