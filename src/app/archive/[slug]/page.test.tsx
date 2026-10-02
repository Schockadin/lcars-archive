import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ArchiveEntryDetail } from "@/types/archive";

const mocks = vi.hoisted(() => ({
  getArchiveEntryBySlug: vi.fn(),
  getViewer: vi.fn(),
  canView: vi.fn(),
  viewerHasPermission: vi.fn(),
  listAllUsers: vi.fn(),
  getDialogueViewPreference: vi.fn(),
  resolveFollowState: vi.fn(),
  listNotes: vi.fn(),
  addStoredContentLinkPreviews: vi.fn(),
  getDialogueMessages: vi.fn(),
}));

vi.mock("@/lib/archive", () => ({
  getArchiveEntryBySlug: mocks.getArchiveEntryBySlug,
}));
vi.mock("@/lib/visibility", () => ({
  getViewer: mocks.getViewer,
  canView: mocks.canView,
  viewerHasPermission: mocks.viewerHasPermission,
}));
vi.mock("@/lib/users", () => ({
  listAllUsers: mocks.listAllUsers,
  getDialogueViewPreference: mocks.getDialogueViewPreference,
}));
vi.mock("@/lib/follows", () => ({
  resolveFollowState: mocks.resolveFollowState,
}));
vi.mock("@/lib/contentNotes", () => ({ listNotes: mocks.listNotes }));
vi.mock("@/lib/autolink", () => ({
  addStoredContentLinkPreviews: mocks.addStoredContentLinkPreviews,
}));
vi.mock("@/lib/dialogues", () => ({
  getDialogueMessages: mocks.getDialogueMessages,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`REDIRECT:${href}`);
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/components/lcars", () => ({
  LcarsReadingModeToggle: () => null,
}));
vi.mock("@/components/DialogueHeader", () => ({
  default: () => <h1>Gesprächskopf</h1>,
}));
vi.mock("@/app/characters/dialogues/[slug]/DialogueContentView", () => ({
  default: ({
    messages,
    flowingTextPreferred,
  }: {
    messages: unknown[];
    flowingTextPreferred: boolean;
  }) => (
    <div data-testid="dialogue-content" data-flowing={String(flowingTextPreferred)}>
      {messages.length} Nachrichten
    </div>
  ),
}));
vi.mock("@/components/ShareMenu", () => ({ default: () => null }));
vi.mock("@/components/DeleteDialogueButton", () => ({ default: () => null }));
vi.mock("@/app/_shared/MarkNewsSeen", () => ({ default: () => null }));
vi.mock("@/app/_shared/NotesPanel", () => ({ default: () => null }));
vi.mock("./ArchiveEntryBody", () => ({
  default: ({
    messages,
    flowingTextPreferred,
  }: {
    messages: unknown[];
    flowingTextPreferred: boolean;
  }) => (
    <div data-testid="archive-body" data-flowing={String(flowingTextPreferred)}>
      {messages.length} Nachrichten
    </div>
  ),
}));

import { getArchiveEntryBySlug } from "@/lib/archive";
import { getDialogueMessages } from "@/lib/dialogues";
import { getDialogueViewPreference } from "@/lib/users";
import { canView, getViewer, viewerHasPermission } from "@/lib/visibility";
import ArchiveEntryPage from "./page";

const CLOSED_DIALOGUE = {
  id: 12,
  slug: "abgeschlossenes-gespraech",
  title: "Abgeschlossenes Gespräch",
  category: "dialogue",
  content: "<p>Gesprächsverlauf</p>",
  tags: [],
  metadata: {
    summary: null,
    aliases: [],
    attributes: [],
    characters: [],
    missions: [],
    setting: null,
    logDate: "2026-09-28",
    participants: [],
    location: null,
  },
  dialogue_open: false,
  ownerUserId: 7,
  isDraft: false,
  updated_at: "2026-09-28",
  sourceMarkdown: "",
  links: [],
  backlinks: [],
} as ArchiveEntryDetail;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getArchiveEntryBySlug).mockResolvedValue(CLOSED_DIALOGUE);
  vi.mocked(getViewer).mockResolvedValue({
    userId: 7,
    role: "player",
    permissions: [],
  });
  vi.mocked(canView).mockReturnValue(true);
  vi.mocked(viewerHasPermission).mockReturnValue(false);
  vi.mocked(getDialogueViewPreference).mockResolvedValue(false);
  vi.mocked(getDialogueMessages).mockResolvedValue([{}, {}] as never);
  mocks.listAllUsers.mockResolvedValue([]);
  mocks.resolveFollowState.mockResolvedValue({ bookmarked: false, subscribed: false });
  mocks.listNotes.mockResolvedValue([]);
  mocks.addStoredContentLinkPreviews.mockImplementation(async (content: string) => content);
});

describe("Archivseite abgeschlossener Gespräche", () => {
  it("bleibt auf /archive und zeigt den Gesprächsverlauf dort an", async () => {
    const page = await ArchiveEntryPage({
      params: Promise.resolve({ slug: CLOSED_DIALOGUE.slug }),
    });

    render(page);

    expect(getDialogueMessages).toHaveBeenCalledWith(CLOSED_DIALOGUE.id);
    expect(getDialogueViewPreference).toHaveBeenCalledWith(7);
    expect(screen.getByTestId("dialogue-content")).toHaveTextContent("2 Nachrichten");
    expect(screen.getByTestId("dialogue-content")).toHaveAttribute("data-flowing", "false");
    expect(screen.getByRole("link", { name: "‹ Gespräche" })).toHaveAttribute(
      "href",
      "/chronologie/dialogue",
    );
  });

  it("leitet offene Gespräche an ihre geschützte Spielansicht weiter", async () => {
    vi.mocked(getArchiveEntryBySlug).mockResolvedValue({
      ...CLOSED_DIALOGUE,
      dialogue_open: true,
    });

    await expect(
      ArchiveEntryPage({
        params: Promise.resolve({ slug: CLOSED_DIALOGUE.slug }),
      }),
    ).rejects.toThrow("REDIRECT:/dialogues/abgeschlossenes-gespraech");
    expect(getDialogueMessages).not.toHaveBeenCalled();
  });
});
