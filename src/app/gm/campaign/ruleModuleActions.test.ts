import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireGM,
  mockGetModule,
  mockSaveModule,
  mockDeleteModule,
  mockResetBase,
} = vi.hoisted(() => ({
  mockRequireGM: vi.fn(),
  mockGetModule: vi.fn(),
  mockSaveModule: vi.fn(),
  mockDeleteModule: vi.fn(),
  mockResetBase: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireGM: mockRequireGM }));
vi.mock("@/lib/campaignRuleModules", () => ({
  deleteCampaignRuleModule: mockDeleteModule,
  getCampaignRuleModule: mockGetModule,
  isBaseRuleModule: (id: string) => id === "sta2e",
  resetBaseCampaignRuleModule: mockResetBase,
  saveCampaignRuleModule: mockSaveModule,
}));

import { BASE_RULE_MODULE } from "@/lib/baseRuleModule";
import {
  deleteCampaignRuleModuleAction,
  resetBaseCampaignRuleModuleAction,
  saveCampaignRuleModuleAction,
} from "./ruleModuleActions";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("Regelmodul-Verwaltung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireGM.mockResolvedValue({ id: 42 });
    mockGetModule.mockResolvedValue({ enabled: true, definition: BASE_RULE_MODULE, updatedAt: null });
  });

  it("speichert das Basismodul immer aktiviert, auch wenn die Anfrage false sendet", async () => {
    const data = formData({
      moduleId: "sta2e",
      definition: JSON.stringify(BASE_RULE_MODULE),
      enabled: "false",
    });

    await expect(saveCampaignRuleModuleAction({}, data)).resolves.toEqual({ success: true });
    expect(mockSaveModule).toHaveBeenCalledWith("sta2e", true, BASE_RULE_MODULE, 42);
  });

  it("verweigert das Löschen des Basismoduls", async () => {
    await expect(deleteCampaignRuleModuleAction({}, formData({ moduleId: "sta2e" }))).resolves.toEqual({
      error: "Das STA-2e-Basismodul kann nicht gelöscht werden.",
    });
    expect(mockDeleteModule).not.toHaveBeenCalled();
  });

  it("löscht optionale Module nach GM-Prüfung", async () => {
    mockGetModule.mockResolvedValue({ enabled: false, definition: { ...BASE_RULE_MODULE, id: "xenobiology" }, updatedAt: null });

    await expect(deleteCampaignRuleModuleAction({}, formData({ moduleId: "xenobiology" }))).resolves.toEqual({ success: true });
    expect(mockRequireGM).toHaveBeenCalledOnce();
    expect(mockDeleteModule).toHaveBeenCalledWith("xenobiology", 42);
  });

  it("setzt das Basismodul auf den Standard zurück", async () => {
    await expect(resetBaseCampaignRuleModuleAction({}, new FormData())).resolves.toEqual({ success: true });
    expect(mockRequireGM).toHaveBeenCalledOnce();
    expect(mockResetBase).toHaveBeenCalledOnce();
  });
});
