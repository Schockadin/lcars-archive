import { describe, expect, it } from "vitest";
import { aliasGenitive, aliasGenitives } from "./autolinkPhrases";

describe("aliasGenitive", () => {
  it("bildet Genitive für Alias-Namen", () => {
    expect(aliasGenitive("T'Vel")).toBe("T'Vels");
    expect(aliasGenitive("Max")).toBe("Max’");
    expect(aliasGenitive("Hans")).toBe("Hans’");
  });

  it("vermeidet leere, bereits flektierte und doppelte Formen", () => {
    expect(aliasGenitive("  ")).toBeNull();
    expect(aliasGenitive("Max’")).toBeNull();
    expect(aliasGenitives(["Max", "Max’", "T'Vel"])).toEqual([
      "Max'",
      "T'Vels",
    ]);
  });
});
