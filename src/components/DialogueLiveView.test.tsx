import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import DialogueLiveView from "./DialogueLiveView";
import type { DialogueMessage } from "@/lib/dialoguesCore";
import type { ArchiveParticipant } from "@/types/archive";

// Alles, was an Server Actions hängt: gemockt. Geprüft wird die Komposition
// aus Verlauf und klebendem Antwortfeld — und der Sprung ans Verlaufsende.
vi.mock("@/app/actions/dialogues", () => ({
  getDialogueSnapshotAction: vi.fn(async () => ({ open: true })),
  releaseDialogueReservationAction: vi.fn(),
  postDialogueMessageAction: vi.fn(async () => ({})),
}));
vi.mock("@/app/_shared/MarkdownEditor", () => ({
  default: ({ id }: { id: string }) => <textarea id={id} name="bodyMarkdown" />,
}));
vi.mock("./DialogueMessageActions", () => ({ default: () => null }));
vi.mock("./DialogueLockPanel", () => ({ default: () => null }));
vi.mock("./InviteDialogueParticipantForm", () => ({ default: () => null }));
vi.mock("./CompleteDialogueButton", () => ({ default: () => null }));
vi.mock("./DeleteDialogueButton", () => ({ default: () => null }));
vi.mock("./FollowButtons", () => ({ default: () => null }));

const DOCK_HEIGHT = 120;

const PARTICIPANTS: ArchiveParticipant[] = [
  { slug: "ada", name: "Ada", kind: "character" },
  { slug: "bo", name: "Bo", kind: "character" },
];

const MESSAGES: DialogueMessage[] = [
  {
    id: 1,
    speaker: { kind: "character", id: 2 },
    characterId: 2,
    characterSlug: "bo",
    characterName: "Bo",
    authorUserId: 2,
    content: "<p>Hallo?</p>",
    createdAt: "2026-09-19T10:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  },
];

let scrollIntoView: ReturnType<typeof vi.fn<Element["scrollIntoView"]>>;

beforeEach(() => {
  scrollIntoView = vi.fn<Element["scrollIntoView"]>();
  // jsdom kennt scrollIntoView nicht und misst nichts — beides hier
  // stellvertretend, damit die Höhe des Docks überhaupt einen Wert hat.
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const height = this.classList.contains("dialogue-reply-dock")
        ? DOCK_HEIGHT
        : 0;
      return { height, width: 0, top: 0, bottom: height, left: 0, right: 0,
        x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderView(
  props: Partial<Parameters<typeof DialogueLiveView>[0]> = {},
) {
  return render(
    <DialogueLiveView
      entrySlug="gespraech"
      title="Ein Gespräch"
      participants={PARTICIPANTS}
      currentUserId={1}
      canModerate={false}
      isParticipant
      myCharacters={[{ key: "c1", name: "Ada" }]}
      isOwner={false}
      inviteCandidates={[]}
      inviteGms={[]}
      inviterPlaysNpcs={false}
      dialogueNpcSpeakerUserId={null}
      initialMessages={MESSAGES}
      initialLockStatus={null}
      initialCanReplyNow
      alreadyRequestedNotify={false}
      {...props}
    />,
  );
}

function threadWrapper(container: HTMLElement): HTMLElement {
  return container.querySelector(".dialogue-play")!
    .firstElementChild as HTMLElement;
}

describe("DialogueLiveView", () => {
  it("stellt Verlauf und Antwortfeld in denselben Block", () => {
    const { container } = renderView();

    // Nur so kann das Feld kleben: Der umschließende Block muss den Verlauf
    // mit umfassen (siehe .dialogue-reply-dock in archive.css).
    const play = container.querySelector(".dialogue-play");
    expect(play?.querySelector(".dialogue-message")).not.toBeNull();
    expect(play?.querySelector(".dialogue-reply-dock")).not.toBeNull();
  });

  it("springt beim Öffnen ans Ende des Verlaufs", () => {
    renderView();

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
      block: "end",
    });
  });

  it("hält dabei die Höhe des Antwortfelds frei", () => {
    const { container } = renderView();

    // Ohne diesen Abstand läge die letzte Nachricht nach dem Sprung genau
    // unter dem klebenden Feld — also unsichtbar.
    expect(threadWrapper(container).style.scrollMarginBottom).toBe(
      `${DOCK_HEIGHT}px`,
    );
  });

  it("hält nichts frei, wenn es gar kein Antwortfeld gibt", () => {
    const { container } = renderView({ isParticipant: false });

    expect(container.querySelector(".dialogue-reply-dock")).toBeNull();
    expect(threadWrapper(container).style.scrollMarginBottom).toBe("");
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
