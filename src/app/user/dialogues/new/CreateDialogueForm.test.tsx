import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateDialogueForm from "./CreateDialogueForm";

// Die Server-Action wird im Test nicht ausgeführt — sie zieht die halbe
// Datenschicht nach (siehe actions.ts) und hat mit der Darstellung nichts zu
// tun.
vi.mock("./actions", () => ({ createDialogueAction: vi.fn() }));
// Der Markdown-Editor fragt beim Mounten serverseitig die Rechtschreib-
// Einstellung ab (cookies()) — im Test ohne Request-Kontext. Für die
// Auswahlfelder dieses Formulars ist er ohnehin unerheblich.
vi.mock("@/app/_shared/MarkdownEditor", () => ({
  default: ({ id }: { id: string }) => <textarea id={id} name="bodyMarkdown" />,
}));

const OWN = [{ id: 1, slug: "eigen", name: "Eigener Charakter" }];
const PARTNERS = [
  { id: 2, slug: "partner", name: "Partnerin", playerId: 9, playerName: "Ada" },
];
const NPCS = [
  {
    id: 3,
    slug: "npc",
    name: "Barkeeper",
    visibility: "gm" as const,
    ownerUserId: null,
  },
];
const GMS = [
  { id: 10, name: "Erste Leitung" },
  { id: 11, name: "Zweite Leitung" },
];

function renderForm(props: Partial<Parameters<typeof CreateDialogueForm>[0]> = {}) {
  return render(
    <CreateDialogueForm
      userId={1}
      ownCharacters={OWN}
      partnerCharacters={PARTNERS}
      npcs={NPCS}
      canPlayNpcs={false}
      gms={GMS}
      locations={[]}
      defaultLogDate={null}
      {...props}
    />,
  );
}

describe("CreateDialogueForm", () => {
  it("bietet NPCs als Gesprächspartner an, aber nicht als eigenen Charakter", () => {
    renderForm();

    const partners = screen.getByLabelText(
      /Gesprächspartner/,
    ) as HTMLSelectElement;
    expect([...partners.options].map((o) => o.textContent)).toContain(
      "Barkeeper",
    );

    const own = screen.getByLabelText(/Dein Charakter/) as HTMLSelectElement;
    expect([...own.options].map((o) => o.textContent)).not.toContain(
      "Barkeeper",
    );
  });

  it("fragt erst nach der Spielleitung, wenn ein NPC gewählt ist", () => {
    renderForm();
    expect(screen.queryByLabelText(/Spielleitung für die NPCs/)).toBeNull();

    const partners = screen.getByLabelText(
      /Gesprächspartner/,
    ) as HTMLSelectElement;
    fireEvent.change(partners, { target: { value: "n3" } });

    const speaker = screen.getByLabelText(
      /Spielleitung für die NPCs/,
    ) as HTMLSelectElement;
    expect([...speaker.options].map((o) => o.textContent)).toEqual([
      "Erste Leitung",
      "Zweite Leitung",
    ]);
  });

  it("fragt bei genau einer Spielleitung nicht, schickt sie aber mit", () => {
    const { container } = renderForm({ gms: [GMS[0]] });

    const partners = screen.getByLabelText(
      /Gesprächspartner/,
    ) as HTMLSelectElement;
    fireEvent.change(partners, { target: { value: "n3" } });

    const field = screen.getByLabelText(
      /Spielleitung für die NPCs/,
    ) as HTMLInputElement;
    expect(field.readOnly).toBe(true);
    expect(field.value).toBe("Erste Leitung");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[type="hidden"][name="npcSpeakerUserId"]',
      )?.value,
    ).toBe("10");
  });

  it("lässt die Spielleitung aus Sicht eines NPC beginnen, ohne nach einer Leitung zu fragen", () => {
    renderForm({ canPlayNpcs: true, gms: [] });

    const own = screen.getByLabelText(/Dein Charakter/) as HTMLSelectElement;
    expect([...own.options].map((o) => o.textContent)).toContain("Barkeeper");

    fireEvent.change(own, { target: { value: "n3" } });
    expect(screen.queryByLabelText(/Spielleitung für die NPCs/)).toBeNull();
  });
});
