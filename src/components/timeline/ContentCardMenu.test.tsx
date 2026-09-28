import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ContentCardMenu from "./ContentCardMenu";

vi.mock("@/components/ShareMenu", () => ({
  default: ({ href }: { href: string }) => (
    <button type="button" data-share-href={href}>
      Teilen
    </button>
  ),
}));

vi.mock("@/app/user/content/ContentStateSelect", () => ({
  default: () => <button type="button">Entwurf/Veröffentlicht</button>,
}));

vi.mock("@/app/user/content/DeleteOwnContentButton", () => ({
  default: () => <button type="button">Löschen</button>,
}));

const props = {
  contentType: "archive_entry" as const,
  id: 42,
  ownerUserId: 7,
  currentUserId: null,
  isDraft: false,
  title: "Die Station",
  href: "/archive/station",
};

describe("ContentCardMenu", () => {
  it("bietet allen das Teilen mit dem Link zur jeweiligen Karte an", () => {
    render(<ContentCardMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Weitere Aktionen" }));

    expect(screen.getByRole("button", { name: "Teilen" })).toHaveAttribute(
      "data-share-href",
      "/archive/station",
    );
    expect(screen.queryByRole("link", { name: "Bearbeiten" })).toBeNull();
  });

  it("zeigt dem Besitzer Bearbeiten, Sichtbarkeit und Löschen", () => {
    render(<ContentCardMenu {...props} currentUserId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Weitere Aktionen" }));

    expect(screen.getByRole("link", { name: "Bearbeiten" })).toHaveAttribute(
      "href",
      "/user/archive/42/edit",
    );
    expect(screen.getByRole("button", { name: "Entwurf/Veröffentlicht" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();
  });
});
