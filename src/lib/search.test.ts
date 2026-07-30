import { describe, it, expect } from "vitest";
import { escapeLikePattern } from "./search";

describe("escapeLikePattern", () => {
  it("maskiert Prozent, Unterstrich und Backslash", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  it("lässt gewöhnlichen Text unverändert", () => {
    expect(escapeLikePattern("Kirk")).toBe("Kirk");
    expect(escapeLikePattern("T'Lorexia")).toBe("T'Lorexia");
  });

  it("maskiert mehrere Sonderzeichen im selben String", () => {
    expect(escapeLikePattern("100%_done\\")).toBe("100\\%\\_done\\\\");
  });
});
