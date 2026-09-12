import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MissionLogList from "./MissionLogList";
import type { MissionLogListItem } from "@/types/missions";

// Die Liste liest das aktive Log aus dem Pfad.
const pathname = vi.hoisted(() => ({ value: "/chronologie/mission/deneb-iv" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

function log(
  id: number,
  title: string,
  author: string | null = "T'Lara",
): MissionLogListItem {
  return {
    id,
    slug: `log-${id}`,
    title,
    session_nr: id,
    log_date: `2400-09-1${id}`,
    author_name: author,
    author_slug: author ? "t-lara" : null,
  };
}

const LOGS = [log(1, "Erster Kontakt"), log(2, "Rückzug", "Marcus Hale")];

function renderList(
  props: Partial<Parameters<typeof MissionLogList>[0]> = {},
) {
  return render(
    <MissionLogList
      missionSlug="deneb-iv"
      logs={LOGS}
      canCreateLog={false}
      {...props}
    />
  );
}

describe("MissionLogList", () => {
  beforeEach(() => {
    pathname.value = "/chronologie/mission/deneb-iv";
  });

  it("führt mit dem Rücklink auf die Missionsliste", () => {
    renderList();

    const back = screen.getByRole("link", { name: "‹ Missionen" });
    expect(back).toHaveAttribute("href", "/chronologie/mission");
    expect(back).toHaveClass("lcars-back-link");
  });

  it("trägt eine Überschrift mit der Anzahl der Logs", () => {
    renderList();

    expect(
      screen.getByRole("heading", { level: 2, name: "Logbücher · 2" }),
    ).toBeInTheDocument();
  });

  it("zählt auch die leere Liste korrekt", () => {
    renderList({ logs: [] });

    expect(
      screen.getByRole("heading", { level: 2, name: "Logbücher · 0" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Keine Logs zu dieser Mission erfasst."),
    ).toBeInTheDocument();
  });

  it("markiert die Synopsis-Zeile, solange kein Log gewählt ist", () => {
    pathname.value = "/chronologie/mission/deneb-iv";
    renderList();

    const syn = screen.getByRole("link", { name: /Synopsis/ });
    expect(syn).toHaveAttribute("href", "/chronologie/mission/deneb-iv");
    expect(syn).toHaveAttribute("aria-current", "page");
  });

  it("markiert stattdessen das offene Log", () => {
    pathname.value = "/chronologie/mission/deneb-iv/log-2";
    renderList();

    expect(screen.getByRole("link", { name: /Synopsis/ })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("link", { name: /Rückzug/ }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("bietet „Neues Log“ nur an, wenn der Betrachter teilnimmt", () => {
    renderList();
    expect(screen.queryByRole("link", { name: "Neues Log" })).toBeNull();

    renderList({ canCreateLog: true });
    expect(screen.getByRole("link", { name: "Neues Log" })).toHaveAttribute(
      "href",
      "/user/mission-logs/new?mission=deneb-iv",
    );
  });

  it("ist als Navigationsbereich ausgezeichnet", () => {
    renderList();

    expect(
      screen.getByRole("navigation", { name: "Logbücher dieser Mission" }),
    ).toBeInTheDocument();
  });
});
