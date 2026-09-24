import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CharacterValuesEditor from "./CharacterValuesEditor";
import { DEFAULT_ADVANCEMENT_RULES } from "@/lib/advancement";
import { parseCharacterStats } from "@/lib/characterStats";
import type { Talent } from "@/lib/talentCatalog";
import type { Focus } from "@/lib/focusCatalog";

const talent: Talent = {
  id: 1,
  name: "Resolut",
  category: "general",
  requirement: null,
  description: "",
  descriptionHtml: "",
  isCustom: false,
};

const focus: Focus = {
  id: 1,
  name: "Warp",
  discipline: "conn",
  description: null,
  descriptionHtml: null,
  isCustom: false,
};

function lockedStats() {
  return parseCharacterStats({
    creationLocked: true,
    attributes: {
      control: 8,
      daring: 8,
      fitness: 8,
      insight: 8,
      presence: 8,
      reason: 8,
    },
    departments: {
      command: 1,
      conn: 1,
      engineering: 1,
      security: 1,
      medicine: 1,
      science: 1,
    },
  });
}

function renderEditor(
  availableAp: number,
  submit = vi.fn(),
  flatSections = false,
) {
  const result = render(
    <CharacterValuesEditor
      stats={lockedStats()}
      onChange={vi.fn()}
      rules={DEFAULT_ADVANCEMENT_RULES}
      talents={[talent]}
      focuses={[focus]}
      species={null}
      idPrefix="test-values"
      showPersonnelFields={false}
      flatSections={flatSections}
      advancement={{
        characterId: 42,
        availableAp,
        pending: false,
        submit,
      }}
    />,
  );
  return { submit, ...result };
}

describe("CharacterValuesEditor – Inline-Steigerungen", () => {
  it("zeigt Kosten am Wert und sendet die konkrete Steigerung", () => {
    const { submit } = renderEditor(100);
    const input = screen.getByLabelText(/Control/);
    const button = input.parentElement?.querySelector("button");

    expect(button).not.toBeNull();
    expect(button).toHaveTextContent("+1 · 20 AP");
    expect(button).toHaveClass("stat-inline-advance--allowed");
    expect(button).toBeEnabled();

    fireEvent.click(button!);
    const payload = submit.mock.calls[0][0] as FormData;
    expect(payload.get("characterId")).toBe("42");
    expect(payload.get("kind")).toBe("attribute");
    expect(payload.get("key")).toBe("control");
  });

  it("färbt unbezahlbare Werte und neue Listen-Einträge rot und sperrt sie", () => {
    renderEditor(0);
    const input = screen.getByLabelText(/Control/);
    const valueButton = input.parentElement?.querySelector("button");
    const talentButton = screen.getByRole("button", {
      name: "Talente hinzufügen für 20 AP",
    });
    const focusButton = screen.getByRole("button", {
      name: "Schwerpunkte hinzufügen für 20 AP",
    });

    for (const button of [valueButton, talentButton, focusButton]) {
      expect(button).toBeDisabled();
      expect(button).toHaveClass("stat-inline-advance--blocked");
    }
  });

  it("vermeidet im bestehenden Werte-Panel zusätzliche Panelrahmen", () => {
    const { container } = renderEditor(100, vi.fn(), true);
    expect(container.querySelector(".stat-sheet-section")).toBeNull();
    expect(container.querySelectorAll(".stat-editor-section")).toHaveLength(4);
  });
});
