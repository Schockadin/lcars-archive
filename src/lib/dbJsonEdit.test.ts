import { describe, expect, it } from "vitest";
import { jsonRootType, parseJsonEditValue } from "./dbJsonEdit";

describe("JSON-Zellen im Datenbank-Overlay", () => {
  it("erkennt JSON-Wurzeltypen", () => {
    expect(jsonRootType({ key: "value" })).toBe("object");
    expect(jsonRootType([1])).toBe("array");
    expect(jsonRootType(null)).toBe("null");
  });

  it("akzeptiert Metadata als Objekt", () => {
    expect(parseJsonEditValue("metadata", '{"participants":[]}')).toEqual({
      value: { participants: [] },
    });
  });

  it("weist serialisierte Metadata-Objekte mit äußeren Anführungszeichen ab", () => {
    const result = parseJsonEditValue("metadata", '"{\\"participants\\":[]}"');
    expect(result).toMatchObject({
      error: expect.stringContaining("JSON-Objekt"),
    });
  });

  it("weist ungültiges JSON ab", () => {
    expect(parseJsonEditValue("metadata", "{bad json}")).toMatchObject({
      error: expect.stringContaining("gültiges JSON"),
    });
  });

  it("bewahrt bei anderen JSON-Spalten den vorhandenen Wurzeltyp", () => {
    expect(parseJsonEditValue("permissions", "{}", "array")).toMatchObject({
      error: expect.stringContaining("JSON-Wurzeltyp"),
    });
  });
});
