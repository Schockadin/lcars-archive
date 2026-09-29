import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ContentCardMenu from "./ContentCardMenu";

vi.mock("@/components/ShareMenu", () => ({
  default: ({
    menuItems,
    exportType,
    exportSlug,
  }: {
    menuItems?: boolean;
    exportType?: string;
    exportSlug?: string;
  }) => (
    menuItems ? (
      <>
        <button role="menuitem">Link kopieren</button>
        <button role="menuitem">Per WhatsApp teilen</button>
        {exportType && exportSlug && (
          <>
            <button role="menuitem">Als Markdown exportieren</button>
            <button role="menuitem">Als PDF exportieren</button>
          </>
        )}
      </>
    ) : <button>Teilen</button>
  ),
}));

vi.mock("@/app/user/content/DeleteOwnContentButton", () => ({
  default: () => <button role="menuitem">Löschen</button>,
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

    expect(screen.getByRole("menuitem", { name: "Link kopieren" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Per WhatsApp teilen" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Als Markdown exportieren" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Als PDF exportieren" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bearbeiten" })).toBeNull();
  });

  it("zeigt dem Besitzer Bearbeiten, Sichtbarkeit und Löschen", () => {
    render(<ContentCardMenu {...props} currentUserId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Weitere Aktionen" }));

    expect(screen.getByRole("link", { name: "Bearbeiten" })).toHaveAttribute(
      "href",
      "/user/archive/42/edit",
    );
    expect(screen.getByRole("menuitem", { name: "Als Entwurf" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Löschen" })).toBeInTheDocument();
  });

  it("schließt das Menü bei Klick außerhalb", () => {
    render(<ContentCardMenu {...props} />);
    const trigger = screen.getByRole("button", { name: "Weitere Aktionen" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.pointerDown(document.body);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu", { name: "Aktionen" })).not.toBeInTheDocument();
  });
});
