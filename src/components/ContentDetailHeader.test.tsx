import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContentDetailHeader, {
  ContentChip,
  ContentChipList,
  ContentMetaValue,
} from "./ContentDetailHeader";

describe("ContentDetailHeader", () => {
  it("rendert den Titel als einzige h1", () => {
    render(<ContentDetailHeader title="Zwischenfall auf Deneb IV" />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Zwischenfall auf Deneb IV");
    // Gemeinsame Titel-Klasse aller Content-Detailseiten.
    expect(headings[0]).toHaveClass("char-file-name");
  });

  it("lässt den Metablock weg, wenn es keine Zeilen gibt", () => {
    const { container } = render(<ContentDetailHeader title="Ohne Meta" />);

    expect(container.querySelector(".archive-dialogue-meta")).toBeNull();
  });

  it("zeigt die Zeilen mit Beschriftung in der übergebenen Reihenfolge", () => {
    const { container } = render(
      <ContentDetailHeader
        title="Mit Meta"
        rows={[
          { label: "Status", children: <ContentMetaValue>Aktiv</ContentMetaValue> },
          {
            label: "Zeitraum",
            children: <ContentMetaValue>15.09.2400 – LAUFEND</ContentMetaValue>,
          },
        ]}
      />
    );

    const labels = [...container.querySelectorAll(".archive-dialogue-label")].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(["Status", "Zeitraum"]);
    expect(screen.getByText("15.09.2400 – LAUFEND")).toHaveClass(
      "archive-dialogue-value",
    );
  });

  it("überspringt Zeilen, die als falsy übergeben werden", () => {
    const logDate: string | null = null;
    const { container } = render(
      <ContentDetailHeader
        title="Teilweise"
        rows={[
          {
            label: "Autor",
            children: <ContentMetaValue>{"T'Lara"}</ContentMetaValue>,
          },
          logDate && {
            label: "Datum",
            children: <ContentMetaValue>{logDate}</ContentMetaValue>,
          },
        ]}
      />
    );

    const labels = [...container.querySelectorAll(".archive-dialogue-label")].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(["Autor"]);
  });
});

describe("ContentChip", () => {
  it("verlinkt mit href und trägt die Chip-Farbe", () => {
    const { container } = render(
      <ContentChip
        href="/characters/t-lara"
        color="var(--lcars-primary)"
        title="T'Lara"
      />
    );

    const link = screen.getByRole("link", { name: "T'Lara" });
    expect(link).toHaveAttribute("href", "/characters/t-lara");
    expect(link).toHaveClass("archive-chip");
    expect(link).not.toHaveClass("archive-chip-static");
    expect(container.querySelector(".archive-chip")).toHaveStyle({
      "--chip-color": "var(--lcars-primary)",
    });
  });

  it("bleibt ohne href ein statischer Chip", () => {
    render(<ContentChip color="var(--lcars-ink-dim)" title="Unbekannt" />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Unbekannt").closest(".archive-chip")).toHaveClass(
      "archive-chip-static",
    );
  });

  it("zeigt das optionale Zusatzlabel", () => {
    render(
      <ContentChipList>
        <ContentChip color="var(--lcars-senary)" title="Deneb IV" label="Ort" />
      </ContentChipList>
    );

    expect(screen.getByText("Ort")).toHaveClass("archive-chip-label");
  });
});
