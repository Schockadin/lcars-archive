import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, queries } = vi.hoisted(() => {
  const sqlMock = Object.assign(vi.fn(), {
    json: vi.fn((value: unknown) => value),
  });
  return {
    sqlMock,
    queries: [] as { query: string; values: unknown[] }[],
  };
});

vi.mock("@/lib/db", () => ({ default: sqlMock }));

import { saveEditorDraft } from "./editorDrafts";

describe("saveEditorDraft", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlMock.json.mockClear();
    queries.length = 0;
    sqlMock.mockImplementation(
      (parts: TemplateStringsArray, ...values: unknown[]) => {
        queries.push({ query: Array.from(parts).join("?"), values });
        return Promise.resolve([{ revision: 2 }]);
      },
    );
  });

  it("legt einen Entwurf ohne bekannte Revision an", async () => {
    await saveEditorDraft(7, "archive", 42, null, { title: "Erste Fassung" });

    expect(queries).toHaveLength(1);
    expect(queries[0].query).toContain("INSERT INTO editor_drafts");
    expect(queries[0].query).toContain("ON CONFLICT");
    expect(queries[0].query).toContain("editor_drafts.expires_at <= NOW()");
  });

  it("aktualisiert einen vorhandenen Entwurf mit seiner erwarteten Revision", async () => {
    const result = await saveEditorDraft(7, "archive", 42, 1, {
      title: "Zweite Fassung",
    });

    expect(result).toEqual({ revision: 2 });
    expect(queries).toHaveLength(1);
    expect(queries[0].query).toContain("UPDATE editor_drafts");
    expect(queries[0].query).toContain("AND revision = ?");
    expect(queries[0].query).toContain("AND expires_at > NOW()");
    expect(queries[0].values).toContain(1);
  });
});
