import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_ADVANCEMENT_RULES } from "@/lib/advancement";

vi.mock("@/lib/dal", () => ({ requireGM: vi.fn(async () => ({ id: 1 })) }));
vi.mock("@/lib/campaign", () => ({ getIngameYearInfo: vi.fn(async () => ({ effectiveYear: 2400 })) }));
vi.mock("@/lib/advancementSettings", () => ({ getAdvancementRules: vi.fn() }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/components/help/HelpHeading", () => ({ default: () => <h1>Kampagne</h1> }));
vi.mock("./IngameYearForm", () => ({ default: () => null }));
vi.mock("../ap/AdvancementRulesForm", () => ({ default: () => <p>Steigerungsregeln bearbeiten</p> }));

import { getAdvancementRules } from "@/lib/advancementSettings";
import AdminCampaignPage from "./page";

describe("Kampagnenregeln", () => {
  it("zeigt nur Ingame-Jahr und Steigerungsregeln, ohne Session-Termine", async () => {
    vi.mocked(getAdvancementRules).mockResolvedValue(DEFAULT_ADVANCEMENT_RULES);
    const { container } = render(await AdminCampaignPage());
    expect(screen.queryByText("Weitere Regeln")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Steigerungsregeln", hidden: true })).toBeInTheDocument();
    expect(screen.getByText("Steigerungsregeln bearbeiten")).toBeInTheDocument();
    expect(screen.queryByText("Anstehende Spieltermine")).not.toBeInTheDocument();
    expect(screen.getByText("Ingame Jahr (2400)")).toBeInTheDocument();
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
  });
});
