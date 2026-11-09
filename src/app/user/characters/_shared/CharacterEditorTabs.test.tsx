import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CharacterEditorTabs from "./CharacterEditorTabs";

describe("CharacterEditorTabs", () => {
  it("renders the supplied character tabs as accessible tabs", () => {
    render(
      <CharacterEditorTabs
        tabs={[
          { id: "values", label: "Werte", content: <p>Werteinhalt</p> },
          { id: "module-techno", label: "Technomage", content: <p>Modulinhalt</p> },
          { id: "files", label: "Dateien", content: <p>Dateiinhalte</p> },
        ]}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Charakter bearbeiten" });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Werte" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Werteinhalt");
    expect(document.getElementById("character-editor-panel-module-techno")).toHaveAttribute("hidden");
  });

  it("activates tabs with clicks and arrow keys", () => {
    const onActiveTabChange = vi.fn();
    render(
      <CharacterEditorTabs
        onActiveTabChange={onActiveTabChange}
        tabs={[
          { id: "values", label: "Werte", content: <p>Werteinhalt</p> },
          { id: "personal", label: "Persönliche Daten", content: <p>Personalinhalt</p> },
        ]}
      />,
    );

    const values = screen.getByRole("tab", { name: "Werte" });
    fireEvent.keyDown(values, { key: "ArrowRight" });
    expect(onActiveTabChange).toHaveBeenCalledWith("personal");
    fireEvent.click(screen.getByRole("tab", { name: "Persönliche Daten" }));
    expect(onActiveTabChange).toHaveBeenLastCalledWith("personal");
  });
});
