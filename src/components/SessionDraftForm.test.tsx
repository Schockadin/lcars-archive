import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SessionDraftForm from "./SessionDraftForm";

describe("SessionDraftForm", () => {
  it("setzt den stabilen Draft-Namensraum am Formular", () => {
    render(
      <SessionDraftForm draftScope="archive:42" aria-label="Editor">
        <input name="title" />
      </SessionDraftForm>,
    );

    expect(screen.getByRole("form", { name: "Editor" })).toHaveAttribute(
      "data-draft-scope",
      "archive:42",
    );
  });

  it("weist einen leeren Draft-Namensraum zurück", () => {
    expect(() => render(<SessionDraftForm draftScope="   " />)).toThrowError(
      /stabilen draftScope/,
    );
  });
});
