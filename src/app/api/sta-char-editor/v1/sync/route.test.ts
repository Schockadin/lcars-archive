import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: null as null | Record<string, unknown>,
  db: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/lib/staCharEditorApi", () => ({
  editorJson: (value: unknown, status = 200) => Response.json(value, { status }),
  getStaEditorContext: () => Promise.resolve(mocks.context),
  isEditorUuid: (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value),
  isRecord: (value: unknown) => typeof value === "object" && value !== null && !Array.isArray(value),
  readEditorJson: async (request: Request) => JSON.parse(await request.text()),
}));

import { GET, POST } from "@/app/api/sta-char-editor/v1/sync/route";

function post(body: unknown) {
  return new Request("http://localhost/api/sta-char-editor/v1/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.context = null;
  mocks.db.mockReset();
});

describe("STA editor sync route access", () => {
  it("does not expose sync data without an active LCARS session", async () => {
    const response = await GET(new Request("http://localhost/api/sta-char-editor/v1/sync"));
    expect(response.status).toBe(401);
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it("rejects invalid changes before reaching the database", async () => {
    mocks.context = { user: { id: 7 }, canShareCampaign: true, canManageCharacters: false };
    const response = await POST(post({ mutations: [{ characterId: "not-a-uuid" }] }));
    expect(response.status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
