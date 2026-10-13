import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RagChat from "./RagChat";

describe("RagChat-Einstiegsvorlagen", () => {
  it("blendet die Vorlagen aus, wenn der Assistent unter /search eingebettet ist", () => {
    render(<RagChat configured showPrompts={false} />);

    expect(
      screen.queryByRole("button", { name: "Was bisher geschah" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fragen" }),
    ).toBeInTheDocument();
  });

  it("zeigt die Vorlagen auf der eigenständigen Assistenten-Seite weiterhin an", () => {
    render(<RagChat configured />);

    expect(
      screen.getByRole("button", { name: "Was bisher geschah" }),
    ).toBeInTheDocument();
  });
});