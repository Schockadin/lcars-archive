import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
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

function menuEintraege(): string[] {
  return screen.getAllByRole("menuitem").map((item) => item.textContent ?? "");
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

// Charaktere, Inhalte und Einstellungen liegen seit v1.29.48 unter
// EINEM Pill „Profil" — gebaut wie Leitung/Admin. Vorher waren es drei
// einzelne Pills, die zusammen mit den Staff-Menüs und dem Logout die Zeile
// sprengten.
describe("HeaderUserNav: Profil-Menü", () => {
  it("führt Inhalte und Einstellungen unter einem Pill zusammen", () => {
    render(<HeaderUserNav permissions={["users.browse"]} />);

    fireEvent.click(screen.getByRole("button", { name: /Profil/ }));
    expect(menuEintraege()).toEqual(["Meine Inhalte", "Einstellungen"]);
  });

  it("zeigt den Charaktere-Eintrag nur mit eigenen Figuren", () => {
    render(<HeaderUserNav permissions={["users.browse"]} hasCharacters />);

    fireEvent.click(screen.getByRole("button", { name: /Profil/ }));
    expect(menuEintraege()).toEqual([
      "Charaktere",
      "Meine Inhalte",
      "Einstellungen",
    ]);
  });
});

// Das Leitungs-Menü ist wie das Admin-Menü gegliedert — neun Einträge in
// einer flachen Liste waren nicht mehr überblickbar.
describe("HeaderUserNav: Gliederung des Leitungs-Menüs", () => {
  it("gruppiert die Einträge nach Aufgabe", () => {
    render(<HeaderUserNav permissions={["gm.access"]} />);

    fireEvent.click(screen.getByRole("button", { name: /Leitung/ }));
    const gruppen = screen
      .getAllByRole("group")
      .map((group) => group.getAttribute("aria-label"));
    expect(gruppen).toEqual([
      "Kampagne",
      "Charaktere",
      "Regelwerk",
      "Inhalte",
    ]);
  });
});
