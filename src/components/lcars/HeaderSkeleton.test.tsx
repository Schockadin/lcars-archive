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

  it("belegt standardmäßig alle sechs festen Header-Plätze", () => {
    const { container } = render(<HeaderSkeleton columns={3} />);
    const nav = container.querySelector("nav.lcars-usernav--header");
    expect(nav).not.toBeNull();
    expect(nav!.children).toHaveLength(6);
    expect(
      [...nav!.children].map((item) =>
        [...item.classList].find((className) =>
          className.startsWith("lcars-usernav-slot--"),
        ),
      ),
    ).toEqual([
      "lcars-usernav-slot--profile",
      "lcars-usernav-slot--rules",
      "lcars-usernav-slot--gm",
      "lcars-usernav-slot--admin",
      "lcars-usernav-slot--help",
      "lcars-usernav-slot--logout",
    ]);
  });
});
