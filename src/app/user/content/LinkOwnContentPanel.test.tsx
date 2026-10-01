import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LinkOwnContentPanel from "./LinkOwnContentPanel";

const { linkOwnContentBatchAction } = vi.hoisted(() => ({
  linkOwnContentBatchAction: vi.fn(),
}));

vi.mock("./linkOwnContentAction", () => ({ linkOwnContentBatchAction }));

describe("LinkOwnContentPanel", () => {
  beforeEach(() => {
    linkOwnContentBatchAction.mockReset();
    linkOwnContentBatchAction.mockResolvedValue({
      total: 2,
      processed: 2,
      changedInBatch: 1,
      linksInBatch: 3,
      done: true,
    });
  });

  it("startet den Batch-Lauf und zeigt den Fortschritt und die Bilanz", async () => {
    render(<LinkOwnContentPanel />);

    expect(
      screen.getByText(/Gespräche bleiben dabei unberührt/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alles verlinken" }));

    await waitFor(() =>
      expect(linkOwnContentBatchAction).toHaveBeenCalledWith(0, 15),
    );
    expect(await screen.findByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(
      screen.getByText("Fertig: 1 von 2 Inhalten verlinkt (3 Verknüpfungen gesetzt)."),
    ).toBeInTheDocument();
  });
});
