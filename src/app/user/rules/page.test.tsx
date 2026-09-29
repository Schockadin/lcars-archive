import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ADVANCEMENT_RULE_FIELDS, DEFAULT_ADVANCEMENT_RULES } from "@/lib/advancement";

vi.mock("@/lib/dal", () => ({ requireNonGuest: vi.fn() }));
vi.mock("@/lib/advancementSettings", () => ({ getAdvancementRules: vi.fn() }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));

import { requireNonGuest } from "@/lib/dal";
import { getAdvancementRules } from "@/lib/advancementSettings";
import UserRulesPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireNonGuest).mockResolvedValue({ id: 1 } as Awaited<ReturnType<typeof requireNonGuest>>);
});

describe("Spieler-Regeln", () => {
  it("zeigt die aktuellen Steigerungsregeln als reine Leseansicht", async () => {
    const rules = { ...DEFAULT_ADVANCEMENT_RULES, apPerStep: 15, apPerSession: 7 };
    vi.mocked(getAdvancementRules).mockResolvedValue(rules);
    const { container } = render(await UserRulesPage());
    expect(screen.getByRole("heading", { name: "Steigerungsregeln" })).toBeInTheDocument();
    const rows = container.querySelectorAll("dl > div");
    expect(rows).toHaveLength(ADVANCEMENT_RULE_FIELDS.length);
    ADVANCEMENT_RULE_FIELDS.forEach((field, index) => {
      expect(rows[index].querySelector("dt")).toHaveTextContent(field.label);
      expect(rows[index].querySelector("dd")).toHaveTextContent(String(rules[field.key]));
    });
    expect(container.querySelector("form, input, select, textarea, button")).toBeNull();
    expect(screen.queryByText(/Weitere Regeln/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talente" })).toHaveAttribute("href", "/user/rules/talents");
  });

  it("prüft die Berechtigung vor dem Laden der Regeln", async () => {
    vi.mocked(requireNonGuest).mockRejectedValueOnce(new Error("FORBIDDEN"));
    await expect(UserRulesPage()).rejects.toThrow("FORBIDDEN");
    expect(getAdvancementRules).not.toHaveBeenCalled();
  });
});
