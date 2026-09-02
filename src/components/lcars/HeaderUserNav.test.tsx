import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HeaderUserNav from "./HeaderUserNav";

// usePathname/logout/Service-Worker-Cache brauchen einen Next-Runtime bzw. eine
// Server-Action — hier stellvertretend gemockt, geprüft wird allein, welche
// Menüs die Rechte eines Users freischalten.
const pathname = vi.hoisted(() => ({ current: "/user" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
vi.mock("@/lib/swCache", () => ({ clearServiceWorkerPageCache: vi.fn() }));

function menuButtons(): string[] {
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent ?? "")
    .filter((label) => label === "Leitung" || label === "Admin");
}

describe("HeaderUserNav: getrennte Staff-Menüs", () => {
  it("zeigt einem reinen GM nur das Leitungs-Menü", () => {
    render(<HeaderUserNav permissions={["gm.access", "users.browse"]} />);
    expect(menuButtons()).toEqual(["Leitung"]);
  });

  it("zeigt einer reinen Administration nur das Admin-Menü", () => {
    render(<HeaderUserNav permissions={["admin.access", "users.manage"]} />);
    expect(menuButtons()).toEqual(["Admin"]);
  });

  it("zeigt bei kombinierten Rollen beide Menüs getrennt nebeneinander", () => {
    render(
      <HeaderUserNav permissions={["gm.access", "admin.access", "users.manage"]} />,
    );
    expect(menuButtons()).toEqual(["Leitung", "Admin"]);
  });

  it("zeigt einem reinen db-admin nur das Admin-Menü (DB-Recht genügt)", () => {
    render(<HeaderUserNav permissions={["sql_read"]} />);
    expect(menuButtons()).toEqual(["Admin"]);
  });

  it("zeigt ohne Staff-Rechte gar kein Staff-Menü", () => {
    render(<HeaderUserNav permissions={["content.follow", "users.browse"]} />);
    expect(menuButtons()).toEqual([]);
  });
});
