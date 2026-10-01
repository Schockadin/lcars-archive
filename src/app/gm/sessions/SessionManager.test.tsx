import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { GameSession } from "@/lib/gameSessions";
import { isDraftableField } from "@/lib/inputDraft";

vi.mock("./actions", () => ({ createSessionAction: vi.fn(), updateSessionAction: vi.fn(), deleteSessionAction: vi.fn() }));
vi.mock("@/app/_shared/FormPrimitives", () => ({ FormError: () => null, FormSuccess: () => null }));
vi.mock("@/app/_shared/MarkdownEditor", () => ({ default: ({ id, name, defaultValue }: { id: string; name: string; defaultValue?: string }) => <textarea id={id} name={name} defaultValue={defaultValue} /> }));
vi.mock("@/components/ModalOverlay", () => ({ default: ({ children, title }: { children: React.ReactNode; title: string }) => <div role="dialog" aria-label={title}>{children}</div> }));

import SessionManager, { SessionDetails } from "./SessionManager";

const SESSION: GameSession = {
  id: 7, title: "Deneb IV 2", sessionDate: "2026-09-20", missionId: 1,
  missionTitle: "Deneb IV", missionSlug: "deneb", missionSessionNumber: 2,
  sessionAp: 3, bonusAp: 1, createdByName: "GM", createdAt: "2026-09-20",
  characterCount: 1, totalAp: 4, characterIds: [2],
  synopsisBlocks: [{ id: 11, blockOrder: 0, missionBlockNumber: 4, ingameDate: "2400-05-12", body: "Zwischenfall", bodyHtml: "<p>Zwischenfall</p>" }],
};
const CHARACTERS = [{ id: 2, name: "T'Lara", playerName: "Spielerin" }];
const MISSIONS = [{ id: 1, title: "Deneb IV", slug: "deneb", startedAt: "2400-05-12" }];

describe("SessionManager", () => {
  it("behält Session nachtragen als Modal über der Kartenliste", () => {
    render(<SessionManager sessions={[SESSION]} characters={CHARACTERS} missions={MISSIONS} defaultSessionAp={3} today="2026-09-29" />);
    expect(screen.getByRole("link", { name: "Deneb IV 2" })).toHaveAttribute("href", "/gm/sessions/7");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Session nachtragen" }));
    expect(screen.getByRole("dialog", { name: "Session nachtragen" })).toBeInTheDocument();
    expect(screen.getByLabelText("Datum")).toHaveValue("2026-09-29");
  });

  it("öffnet den Editor am Log-Eintrag und bietet Speichern, Entfernen und Zurücknehmen", () => {
    const { container } = render(<SessionDetails session={SESSION} characters={CHARACTERS} missions={MISSIONS} detailPage />);
    expect(screen.getByText("Zwischenfall")).toBeInTheDocument();
    const editLink = screen.getByRole("link", { name: "Log-Eintrag bearbeiten" });
    fireEvent.click(editLink);
    expect(editLink).toHaveAttribute("href", "#session-7-synopsis-block-0");
    const synopsisBlock = container.querySelector("#session-7-synopsis-block-0");
    expect(synopsisBlock).toHaveAttribute("data-no-draft");
    expect(isDraftableField(synopsisBlock?.querySelector("input[name=\"synopsisDate\"]") ?? null)).toBe(false);
    expect(isDraftableField(synopsisBlock?.querySelector("textarea[name=\"synopsisText\"]") ?? null)).toBe(false);
    expect(screen.getByLabelText("Ingame-Datum")).toHaveValue("2400-05-12");
    expect(container.querySelector('input[name="synopsisId"]')).toHaveValue("11");
    expect(screen.getByRole("checkbox", { name: /T'Lara/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Session speichern" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Session zurücknehmen" }).closest("form")).toContainHTML('name="returnToSessions"');
    fireEvent.click(screen.getByRole("button", { name: "Log-Eintrag 1 entfernen" }));
    expect(screen.queryByLabelText("Ingame-Datum")).not.toBeInTheDocument();
  });
});
