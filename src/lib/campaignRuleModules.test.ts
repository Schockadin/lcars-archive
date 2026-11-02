import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: Object.assign(mockQuery, { json: (value: unknown) => value }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { BASE_RULE_MODULE, BASE_RULE_MODULE_ID } from "@/lib/baseRuleModule";
import { TECHNOMAGE_RULE_MODULE } from "@/lib/technomageRuleModule";
import {
  deleteCampaignRuleModule,
  getCampaignRuleModule,
  listCampaignRuleModules,
} from "@/lib/campaignRuleModules";

describe("Kampagnen-Regelmodule", () => {
  beforeEach(() => mockQuery.mockReset());

  it("liefert Basismodul und Technomage-Standard, wenn noch keine Overrides existieren", async () => {
    mockQuery.mockResolvedValue([]);

    const modules = await listCampaignRuleModules();

    expect(modules.map((module) => module.definition.id)).toEqual(["sta2e", "technomage"]);
    expect(modules.find((module) => module.definition.id === BASE_RULE_MODULE_ID)).toMatchObject({
      enabled: true,
      definition: BASE_RULE_MODULE,
    });
    expect(modules.find((module) => module.definition.id === "technomage")).toMatchObject({
      enabled: true,
      definition: TECHNOMAGE_RULE_MODULE,
    });
  });

  it("hält das Basismodul trotz gespeichertem deaktiviertem Override aktiv", async () => {
    mockQuery.mockResolvedValue([{
      id: BASE_RULE_MODULE_ID,
      enabled: false,
      definition: BASE_RULE_MODULE,
      updated_at: null,
    }]);

    await expect(getCampaignRuleModule(BASE_RULE_MODULE_ID)).resolves.toMatchObject({ enabled: true });
    await expect(listCampaignRuleModules()).resolves.toContainEqual(expect.objectContaining({
      enabled: true,
      definition: BASE_RULE_MODULE,
    }));
  });

  it("führt für das Basismodul keine Löschung aus", async () => {
    await deleteCampaignRuleModule(BASE_RULE_MODULE_ID, 42);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("unterdrückt das eingebaute Technomage-Standardmodul nach dem Löschen", async () => {
    mockQuery.mockResolvedValue([{
      id: "technomage",
      enabled: false,
      definition: { id: "technomage", __campaignRuleModuleDeleted: true },
      updated_at: null,
    }]);

    await expect(getCampaignRuleModule("technomage")).resolves.toBeNull();
    await expect(listCampaignRuleModules()).resolves.not.toContainEqual(
      expect.objectContaining({ definition: expect.objectContaining({ id: "technomage" }) }),
    );
  });
});
