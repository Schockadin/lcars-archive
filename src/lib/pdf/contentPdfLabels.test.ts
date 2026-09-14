import { describe, expect, it } from "vitest";
import {
  contentSubline,
  contentTab,
  formatFrontmatterLines,
  frontmatterLabel,
} from "./ContentPdfDocument";

// Die Beschriftungen des Einzel-Exports: Titelreiter, Unterzeile und die
// Datenzeilen aus dem Frontmatter. Sie tragen die Aufmachung von
// Charakterbogen und Missionsakte in den Ausdruck eines einzelnen Inhalts —
// was hier leer oder roh bliebe, stünde so auf dem Blatt.

describe("contentTab", () => {
  it("gibt jeder Inhaltsart ihren eigenen Titelreiter", () => {
    expect(contentTab("archive_entry")).toBe("ARCHIV");
    expect(contentTab("mission")).toBe("MISSION");
    expect(contentTab("mission_log")).toBe("LOGBUCH");
    expect(contentTab("character")).toBe("PERSONAL");
  });
});

describe("contentSubline", () => {
  it("nennt Titel und Art des Ausdrucks", () => {
    expect(contentSubline("mission_log", "Erster Kontakt")).toBe(
      "Erster Kontakt — Einsatzbericht",
    );
  });
});

describe("frontmatterLabel", () => {
  it("übersetzt bekannte Schlüssel ins Deutsche", () => {
    expect(frontmatterLabel("started_at")).toBe("Beginn");
    expect(frontmatterLabel("session_nr")).toBe("Session");
  });

  it("lässt unbekannte Schlüssel stehen, statt sie zu verschlucken", () => {
    expect(frontmatterLabel("warp_core")).toBe("warp_core");
  });
});

describe("formatFrontmatterLines", () => {
  it("lässt leere Werte und leere Listen weg", () => {
    const lines = formatFrontmatterLines({
      status: "completed",
      teaser: "",
      tags: [],
      ended_at: null,
    });
    expect(lines).toEqual([
      { key: "status", label: "Status", text: "completed" },
    ]);
  });

  it("überspringt Titel und Art — beide stehen schon im Kopf des Blatts", () => {
    expect(
      formatFrontmatterLines({
        title: "Erster Kontakt",
        type: "mission-log",
        slug: "erster-kontakt",
      }),
    ).toEqual([{ key: "slug", label: "Kennung", text: "erster-kontakt" }]);
  });

  it("fasst Listen und Merkmalspaare zu einer Zeile zusammen", () => {
    expect(
      formatFrontmatterLines({
        tags: ["erstkontakt", "diplomatie"],
        attributes: [
          { label: "Schiff", value: "Voyager" },
          { label: "Sektor", value: "Delta" },
        ],
      }),
    ).toEqual([
      { key: "tags", label: "Schlagworte", text: "erstkontakt, diplomatie" },
      {
        key: "attributes",
        label: "Merkmale",
        text: "Schiff: Voyager · Sektor: Delta",
      },
    ]);
  });

  it("übersetzt auch die Schlüssel innerhalb eines Objektwerts", () => {
    expect(
      formatFrontmatterLines({
        location: { slug: "ds9", species: "bajoranisch" },
      }),
    ).toEqual([
      {
        key: "location",
        label: "Ort",
        text: "Kennung: ds9 · Spezies: bajoranisch",
      },
    ]);
  });
});
