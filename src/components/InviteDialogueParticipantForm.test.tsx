import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InviteDialogueParticipantForm from "./InviteDialogueParticipantForm";
import { inviteDialogueParticipantAction } from "@/app/actions/dialogues";

// Die Server-Action zieht die halbe Datenschicht nach — hier nur gemockt,
// geprüft wird die Auswahl und was die Komponente an sie übergibt.
vi.mock("@/app/actions/dialogues", () => ({
  inviteDialogueParticipantAction: vi.fn(async () => ({})),
}));

const CANDIDATES = [
  {
    key: "c2",
    name: "Partnerin",
    playerName: "Ada",
    kind: "character" as const,
    isActive: true,
  },
  {
    key: "n3",
    name: "Barkeeper",
    playerName: "NPC",
    kind: "npc" as const,
    isActive: true,
  },
];
const GMS = [
  { id: 10, name: "Erste Leitung" },
  { id: 11, name: "Zweite Leitung" },
];

function renderForm(
  props: Partial<Parameters<typeof InviteDialogueParticipantForm>[0]> = {},
) {
  return render(
    <InviteDialogueParticipantForm
      entrySlug="gespraech"
      candidates={CANDIDATES}
      gms={GMS}
      inviterPlaysNpcs={false}
      npcSpeakerUserId={null}
      {...props}
    />,
  );
}

function select(value: string) {
  const list = screen.getByLabelText(
    /Weitere Personen einladen/,
  ) as HTMLSelectElement;
  fireEvent.change(list, { target: { value } });
  return list;
}

describe("InviteDialogueParticipantForm", () => {
  beforeEach(() => {
    vi.mocked(inviteDialogueParticipantAction).mockClear();
  });

  // Der Kern der Änderung: NPCs stehen beim nachträglichen Einladen allen
  // offen, nicht nur der Spielleitung — wie beim Anlegen eines Gesprächs.
  it("bietet NPCs auch einer Person an, die sie nicht selbst spielt", () => {
    renderForm();

    const list = screen.getByLabelText(
      /Weitere Personen einladen/,
    ) as HTMLSelectElement;
    expect([...list.options].map((o) => o.textContent)).toEqual([
      "Partnerin (Ada)",
      "Barkeeper (NPC)",
    ]);
  });

  it("fragt erst nach der Spielleitung, wenn ein NPC gewählt ist", () => {
    renderForm();
    expect(screen.queryByLabelText(/Spielleitung für die NPCs/)).toBeNull();

    select("c2");
    expect(screen.queryByLabelText(/Spielleitung für die NPCs/)).toBeNull();

    select("n3");
    const speaker = screen.getByLabelText(
      /Spielleitung für die NPCs/,
    ) as HTMLSelectElement;
    expect([...speaker.options].map((o) => o.textContent)).toEqual([
      "Bitte wählen",
      "Erste Leitung",
      "Zweite Leitung",
    ]);
  });

  it("schickt die gewählte Spielleitung an die Action", () => {
    renderForm();
    select("n3");
    fireEvent.change(screen.getByLabelText(/Spielleitung für die NPCs/), {
      target: { value: "11" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Einladen" }));

    expect(inviteDialogueParticipantAction).toHaveBeenCalledWith(
      "gespraech",
      ["n3"],
      11,
    );
  });

  // Steht der NPC-Sprecher für dieses Gespräch schon fest, wird nicht erneut
  // gefragt — sonst könnte eine zweite Leitung für dasselbe Gespräch
  // zuständig werden.
  it("fragt nicht, wenn das Gespräch schon eine NPC-Leitung hat", () => {
    renderForm({ npcSpeakerUserId: 10 });
    select("n3");

    expect(screen.queryByLabelText(/Spielleitung für die NPCs/)).toBeNull();
  });

  it("fragt die Spielleitung nicht nach sich selbst", () => {
    renderForm({ inviterPlaysNpcs: true, gms: [] });
    select("n3");

    expect(screen.queryByLabelText(/Spielleitung für die NPCs/)).toBeNull();
  });

  it("zeigt bei genau einer Spielleitung nur, wer es sein wird", () => {
    renderForm({ gms: [GMS[0]] });
    select("n3");

    const field = screen.getByLabelText(
      /Spielleitung für die NPCs/,
    ) as HTMLInputElement;
    expect(field.readOnly).toBe(true);
    expect(field.value).toBe("Erste Leitung");
  });

  it("ordnet die vier Statusgruppen und sortiert jede alphabetisch", () => {
    renderForm({
      candidates: [
        {
          key: "n-inactive",
          name: "Orion",
          playerName: "NPC",
          kind: "npc",
          isActive: false,
        },
        {
          key: "c-active-z",
          name: "Zara",
          playerName: "Zoë",
          kind: "character",
          isActive: true,
        },
        {
          key: "n-active",
          name: "Mira",
          playerName: "NPC",
          kind: "npc",
          isActive: true,
        },
        {
          key: "c-inactive",
          name: "Deceased",
          playerName: "Ada",
          kind: "character",
          isActive: false,
        },
        {
          key: "c-active-a",
          name: "Ada",
          playerName: "Lea",
          kind: "character",
          isActive: true,
        },
      ],
    });

    const list = screen.getByLabelText(
      /Weitere Personen einladen/,
    ) as HTMLSelectElement;
    expect(
      [...list.querySelectorAll("optgroup")].map((group) => group.label),
    ).toEqual([
      "Charaktere (aktiv)",
      "NPCs (aktiv)",
      "Charaktere (inaktiv/tot/missing)",
      "NPCs (inaktiv/tot/missing)",
    ]);
    expect([...list.options].map((option) => option.textContent)).toEqual([
      "Ada (Lea)",
      "Zara (Zoë)",
      "Mira (NPC)",
      "Deceased (Ada)",
      "Orion (NPC)",
    ]);
  });

  it("filtert nach dem Spielernamen", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Personen suchen"), {
      target: { value: "ada" },
    });

    const list = screen.getByLabelText(
      /Weitere Personen einladen/,
    ) as HTMLSelectElement;
    expect([...list.options].map((option) => option.textContent)).toEqual([
      "Partnerin (Ada)",
    ]);
  });

  it("behält ausgewählte Personen beim Filtern und beim Einladen bei", () => {
    renderForm();
    select("c2");
    fireEvent.change(screen.getByLabelText("Personen suchen"), {
      target: { value: "barkeeper" },
    });
    select("n3");
    fireEvent.click(screen.getByRole("button", { name: "Einladen" }));

    expect(inviteDialogueParticipantAction).toHaveBeenCalledWith(
      "gespraech",
      ["c2", "n3"],
      null,
    );
  });
});
