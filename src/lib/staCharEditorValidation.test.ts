import { describe, expect, it } from "vitest";
import { sanitizeStaEditorCharacter, validateStaEditorModulePack } from "@/lib/staCharEditorValidation";

describe("STA character editor input validation", () => {
  it("normalizes character fields and numeric values", () => {
    const result = sanitizeStaEditorCharacter({
      name: "  Captain Test ",
      creationMethod: "ap",
      attributes: { control: 9, invalid: 99, "not an id": 4 },
      values: ["  Seek truth  ", 4, ""],
      notes: "x".repeat(11_000),
    });
    expect(result?.name).toBe("Captain Test");
    expect(result?.attributes).toEqual({ control: 9 });
    expect(result?.values).toEqual(["Seek truth"]);
    expect(result?.notes).toHaveLength(10_000);
  });

  it("rejects a character without a name", () => {
    expect(sanitizeStaEditorCharacter({ name: "  " })).toBeNull();
  });

  it("accepts declarative versioned module packs", () => {
    expect(validateStaEditorModulePack({
      manifest: { schemaVersion: 1, id: "example.species", version: "1.2.0", title: "Species" },
      species: [{ id: "example", name: "Example" }],
      creationRules: { methods: ["points", "ap"], defaultMethod: "points" },
    })).not.toBeNull();
  });

  it("rejects executable fields and unsupported rules", () => {
    const base = { manifest: { schemaVersion: 1, id: "example.species", version: "1.0.0", title: "Species" } };
    expect(validateStaEditorModulePack({ ...base, script: "run()" })).toBeNull();
    expect(validateStaEditorModulePack({ ...base, creationRules: { methods: ["custom"] } })).toBeNull();
  });
});
