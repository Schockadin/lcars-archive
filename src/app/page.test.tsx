import type { ReactElement, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

describe("HomePageFallback", () => {
  it("zeigt vor der Session-Abfrage nur die neutrale Startseiten-Shell", () => {
    const page = Page() as ReactElement<{ fallback: ReactNode }>;
    render(page.props.fallback);

    expect(screen.getByRole("heading", { name: "Startseite" })).toBeTruthy();
    expect(screen.getByLabelText("Startseite wird geladen")).toBeTruthy();
    expect(screen.queryByText(/Angemeldet als|Willkommen,/)).toBeNull();
  });
});
