import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import HeaderSkeleton from "./HeaderSkeleton";

describe("HeaderSkeleton", () => {
  it("rendert die angegebene Zahl an Platzhalter-Pillen im UserNav-Raster", () => {
    const { container } = render(<HeaderSkeleton count={5} columns={3} />);
    const nav = container.querySelector("nav.lcars-usernav");
    expect(nav).not.toBeNull();
    expect(nav).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".lcars-skel")).toHaveLength(5);
  });
});
