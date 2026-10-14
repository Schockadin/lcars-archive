import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MissionTimeline from "./MissionTimeline";
import type { TimelineEvent } from "@/lib/timelineTypes";
import type { MissionLogListItem } from "@/types/missions";

function event(
  id: string,
  overrides: Partial<TimelineEvent> = {},
): TimelineEvent {
  return {
    id,
    date: "2401-03-05",
    title: id,
    detail: null,
    category: "discovery",
    origin: "marker",
    sourceType: "mission",
    sourceTitle: "Mission",
    href: "/chronologie/mission/mission",
    people: [],
    ...overrides,
  };
}

const logs: MissionLogListItem[] = [
  {
    id: 1,
    slug: "log-1",
    title: "Protokoll am selben Tag",
    session_nr: 1,
    log_date: "2401-03-05",
    author_name: "T'Lara",
    author_slug: "t-lara",
    ownerUserId: null,
    isDraft: false,
  },
  {
    id: 2,
    slug: "log-2",
    title: "Protokoll am Folgetag",
    session_nr: 2,
    log_date: "2401-03-06",
    author_name: null,
    author_slug: null,
    ownerUserId: null,
    isDraft: false,
  },
];

const dialogues = [
  event("Kanal geöffnet", {
    sourceType: "archive_entry",
    category: "dialogue",
    origin: "metadata",
    href: "/archive/kanal-geoeffnet",
  }),
  event("Späteres Gespräch", {
    date: "2401-03-06",
    sourceType: "archive_entry",
    category: "dialogue",
    origin: "metadata",
    href: "/archive/spaeteres-gespraech",
  }),
];

describe("MissionTimeline", () => {
  it("zeigt anfangs nur Missionstext-Ereignisse und klappt passende Karten auf", () => {
    render(
      <MissionTimeline
        missionSlug="deneb-iv"
        events={[event("Erster Kontakt")]}
        logs={logs}
        dialogues={dialogues}
        canCreateLog={false}
        fullSynopsisHtml={null}
        synopsisBlocks={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Erster Kontakt/ }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("link", { name: /Protokoll am selben Tag/ }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /Kanal geöffnet/ })).toBeNull();
    expect(screen.queryByText("Inhaltsverzeichnis")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Erster Kontakt/ }));

    expect(
      screen.getByRole("link", { name: /Protokoll am selben Tag/ }),
    ).toHaveAttribute("href", "/chronologie/mission/deneb-iv/log-1");
    expect(
      screen.getByRole("link", { name: /Kanal geöffnet/ }),
    ).toHaveAttribute("href", "/archive/kanal-geoeffnet");
    expect(
      screen.queryByRole("link", { name: /Protokoll am Folgetag/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /Späteres Gespräch/ }),
    ).toBeNull();
  });

  it("behält den Knopf zum Anlegen eines Missionslogs", () => {
    render(
      <MissionTimeline
        missionSlug="deneb-iv"
        events={[]}
        logs={[]}
        dialogues={[]}
        canCreateLog
        fullSynopsisHtml={null}
        synopsisBlocks={[]}
      />,
    );

    expect(screen.getByRole("link", { name: "Neues Log" })).toHaveAttribute(
      "href",
      "/user/mission-logs/new?mission=deneb-iv",
    );
  });
});
