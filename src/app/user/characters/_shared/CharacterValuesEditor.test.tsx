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
  stats = lockedStats(),
) {
  const result = render(
    <CharacterValuesEditor
      stats={stats}
      onChange={vi.fn()}
      rules={DEFAULT_ADVANCEMENT_RULES}
      talents={[talent]}
      focuses={[focus]}
      species={[]}
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
  it("zeigt beim STA-2e-Punktesystem die 56/16-Gesamtsummen an", () => {
    const stats = parseCharacterStats({
      creationMethod: "sta2e-point-buy",
      attributes: {
        control: 7,
        daring: 7,
        fitness: 7,
        insight: 7,
        presence: 7,
        reason: 7,
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

    renderEditor(0, vi.fn(), false, stats);

    expect(screen.getByText("42 / 56 Punkte verteilt")).toBeInTheDocument();
    expect(screen.getByText("6 / 16 Punkte verteilt")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("zeigt die Spezies-Abilities der gewählten Spezies und den Rollenbonus", () => {
    const stats = lockedStats();
    stats.characterRole = "Communications Officer";

    render(
      <CharacterValuesEditor
        stats={stats}
        onChange={vi.fn()}
        rules={DEFAULT_ADVANCEMENT_RULES}
        talents={[talent]}
        focuses={[focus]}
        species={["Human"]}
        idPrefix="test-values"
        showPersonnelFields={false}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /Human — Faith of the Heart/ })).toBeInTheDocument();
    expect(screen.getByText(/zwei Erfolge/)).toBeInTheDocument();
    expect(screen.getByText("Role Bonus")).toBeInTheDocument();
  });

  it("bietet die STA-2e-Career-Events mit ihren Boni an", () => {
    const stats = lockedStats();
    stats.careerEvents = ["breakthrough-or-invention"];

    render(
      <CharacterValuesEditor
        stats={stats}
        onChange={vi.fn()}
        rules={DEFAULT_ADVANCEMENT_RULES}
        talents={[talent]}
        focuses={[focus]}
        species={[]}
        idPrefix="test-values"
        showPersonnelFields={false}
      />,
    );

    expect(screen.getAllByRole("option", { name: /Transporter Accident/ })).toHaveLength(2);
    expect(screen.getByText(/\+1 Attribut \(beliebig\), \+1 Disziplin \(Technik\), 1 Fokus/)).toBeInTheDocument();
    expect(screen.getByText(/Inventor of X/)).toBeInTheDocument();
    expect(screen.getByText(/Experimental Technology/)).toBeInTheDocument();
  });

  it("speichert eine gewählte Career Event Option als Katalogeintrag", () => {
    const onChange = vi.fn();
    render(
      <CharacterValuesEditor
        stats={lockedStats()}
        onChange={onChange}
        rules={DEFAULT_ADVANCEMENT_RULES}
        talents={[talent]}
        focuses={[focus]}
        species={[]}
        idPrefix="test-values"
        showPersonnelFields={false}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Career Event 1/ }), {
      target: { value: "first-contact" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ careerEvents: ["first-contact"] }),
    );
  });

  it("würfelt ein Career Event mit dem W20 für den ausgewählten Platz", () => {
    const onChange = vi.fn();
    const random = vi.spyOn(Math, "random").mockReturnValue(0.999999);
    const stats = lockedStats();
    stats.careerEvents = ["first-contact"];
    render(
      <CharacterValuesEditor
        stats={stats}
        onChange={onChange}
        rules={DEFAULT_ADVANCEMENT_RULES}
        talents={[talent]}
        focuses={[focus]}
        species={[]}
        idPrefix="test-values"
        showPersonnelFields={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Career Event 2 mit einem W20 würfeln" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        careerEvents: ["first-contact", "transporter-accident"],
      }),
    );
    random.mockRestore();
  });

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

  it("blendet Steigern bei erreichtem Maximalwert aus", () => {
    const stats = lockedStats();
    stats.attributes.reason = 12;
    stats.departments.command = 5;

    const { container } = renderEditor(100, vi.fn(), false, stats);

    expect(
      screen.getByLabelText(/Reason/).parentElement?.querySelector("button"),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Command/).parentElement?.querySelector("button"),
    ).toBeNull();
    expect(
      container.querySelectorAll(".stat-editor-value-control > button"),
    ).toHaveLength(10);
  });

  it("blendet eine Steigerung auf 12 oder 5 aus, wenn der Gruppenhöchstwert belegt ist", () => {
    const stats = lockedStats();
    stats.attributes.reason = 12;
    stats.attributes.control = 11;
    stats.departments.command = 5;
    stats.departments.conn = 4;

    const { container } = renderEditor(100, vi.fn(), false, stats);

    expect(
      screen.getByLabelText(/Control/).parentElement?.querySelector("button"),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Conn/).parentElement?.querySelector("button"),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Daring/).parentElement?.querySelector("button"),
    ).not.toBeNull();
    expect(
      screen.getByLabelText(/Engineering/).parentElement?.querySelector("button"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".stat-editor-value-control > button"),
    ).toHaveLength(8);
  });

  it("blendet Steigern aus, wenn die nächste Stufe die Verteilungsgrenze überschreitet", () => {
    const stats = lockedStats();
    stats.attributes.control = 10;
    stats.attributes.daring = 11;
    stats.attributes.fitness = 11;
    stats.departments.command = 3;
    stats.departments.conn = 4;
    stats.departments.engineering = 4;

    const { container } = renderEditor(100, vi.fn(), false, stats);

    expect(
      screen.getByLabelText(/Control/).parentElement?.querySelector("button"),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Command/).parentElement?.querySelector("button"),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Daring/).parentElement?.querySelector("button"),
    ).not.toBeNull();
    expect(
      screen.getByLabelText(/Conn/).parentElement?.querySelector("button"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".stat-editor-value-control > button"),
    ).toHaveLength(10);
  });

  it("vermeidet im bestehenden Werte-Panel zusätzliche Panelrahmen", () => {
    const { container } = renderEditor(100, vi.fn(), true);
    expect(container.querySelector(".stat-sheet-section")).toBeNull();
    expect(container.querySelectorAll(".stat-editor-section")).toHaveLength(4);
  });
});
