import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ context: null as null | Record<string, unknown>, db: vi.fn() }));

vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/lib/staCharEditorApi", () => ({
  editorJson: (value: unknown, status = 200) => Response.json(value, { status }),
  getStaEditorContext: () => Promise.resolve(mocks.context),
  isRecord: (value: unknown) => typeof value === "object" && value !== null && !Array.isArray(value),
  readEditorJson: async (request: Request) => JSON.parse(await request.text()),
}));

import { GET, POST } from "@/app/api/sta-char-editor/v1/modules/route";

beforeEach(() => {
  mocks.context = null;
  mocks.db.mockReset();
});

describe("STA editor module route access", () => {
  it("does not disclose modules without an active LCARS session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it("requires a validated declarative pack", async () => {
    mocks.context = { user: { id: 7 }, canShareCampaign: true, canManageModules: true };
    const response = await POST(new Request("http://localhost/api/sta-char-editor/v1/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "campaign", pack: { script: "alert(1)" } }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
