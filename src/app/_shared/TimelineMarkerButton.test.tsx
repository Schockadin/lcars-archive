import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TimelineMarkerButton, { timelineMarker } from "./TimelineMarkerButton";
import { EVENT_CATEGORIES, parseTimelineMarkers } from "@/lib/timelineTypes";

// Der Knopf schreibt in eine FREMDE Textarea (per id, siehe
// TimelineMarkerButton.tsx) — die steht hier im selben Baum, wie im Editor
// auch.
function setup(initial = "") {
  render(
    <>
      <textarea id="ziel" defaultValue={initial} />
      <TimelineMarkerButton textareaId="ziel" />
    </>,
  );
  return document.getElementById("ziel") as HTMLTextAreaElement;
}

function oeffnen() {
  fireEvent.click(screen.getByRole("button", { name: "Zeitleisten-Ereignis einfügen" }));
}

function ausfuellen({
  datum = "2401-03-14",
  titel = "Erstkontakt",
  art = "discovery",
}: { datum?: string; titel?: string; art?: string } = {}) {
  fireEvent.change(screen.getByLabelText("Datum"), { target: { value: datum } });
  fireEvent.change(screen.getByLabelText("Titel"), { target: { value: titel } });
  fireEvent.change(screen.getByLabelText("Ereignisart"), {
    target: { value: art },
  });
  fireEvent.submit(screen.getByRole("button", { name: "Einfügen" }).closest("form")!);
}

describe("TimelineMarkerButton", () => {
  it("öffnet das Fenster erst auf Klick", () => {
    setup();
    expect(screen.queryByLabelText("Datum")).not.toBeInTheDocument();

    oeffnen();
    expect(screen.getByLabelText("Datum")).toBeInTheDocument();
    expect(screen.getByLabelText("Titel")).toBeInTheDocument();
  });

  it("bietet genau die Ereignisarten der Chronologie zur Auswahl an", () => {
    setup();
    oeffnen();

    const auswahl = screen.getByLabelText("Ereignisart") as HTMLSelectElement;
    expect([...auswahl.options].map((o) => o.value)).toEqual(
      EVENT_CATEGORIES.map((c) => c.key),
    );
    expect([...auswahl.options].map((o) => o.textContent)).toEqual(
      EVENT_CATEGORIES.map((c) => c.label),
    );
    // „Sonstiges" ist die Vorgabe — wie im Formular „Ereignis eintragen".
    expect(auswahl.value).toBe("other");
  });

  it("setzt die Marke mit Datum, Titel und gewählter Art in die Textarea", () => {
    const textarea = setup();
    oeffnen();
    ausfuellen();

    expect(textarea.value).toBe(
      "<!-- timeline: 2401-03-14 | Erstkontakt | discovery -->",
    );
  });

  it("schreibt eine Marke, die die Chronologie wieder einliest", () => {
    const textarea = setup();
    oeffnen();
    ausfuellen({ art: "conflict", titel: "Gefecht bei Bajor" });

    expect(parseTimelineMarkers(textarea.value)).toEqual([
      {
        date: "2401-03-14",
        title: "Gefecht bei Bajor",
        category: "conflict",
        anchor: 1,
      },
    ]);
  });

  it("setzt die Marke an der Cursor-Stelle auf eine eigene Zeile", () => {
    const textarea = setup("Davor.Danach.");
    textarea.setSelectionRange(6, 6);
    oeffnen();
    ausfuellen();

    expect(textarea.value).toBe(
      "Davor.\n<!-- timeline: 2401-03-14 | Erstkontakt | discovery -->\nDanach.",
    );
  });

  it("entschärft Zeichen im Titel, die die Marke zerlegen würden", () => {
    const textarea = setup();
    oeffnen();
    ausfuellen({ titel: "Vertrag | Fassung 2401 --> 2402" });

    expect(textarea.value).toBe(
      "<!-- timeline: 2401-03-14 | Vertrag / Fassung 2401 → 2402 | discovery -->",
    );
    // Entscheidend: die Marke bleibt eine Marke — Titel und Kategorie stehen
    // noch dort, wo die Chronologie sie erwartet.
    expect(parseTimelineMarkers(textarea.value)[0]).toMatchObject({
      title: "Vertrag / Fassung 2401 → 2402",
      category: "discovery",
    });
  });

  it("schließt das Fenster nach dem Einfügen und beginnt beim nächsten Mal leer", () => {
    setup();
    oeffnen();
    ausfuellen();
    expect(screen.queryByLabelText("Datum")).not.toBeInTheDocument();

    oeffnen();
    expect((screen.getByLabelText("Datum") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Titel") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Ereignisart") as HTMLSelectElement).value).toBe(
      "other",
    );
  });
});

describe("timelineMarker", () => {
  it("baut die Marke in der Form, die parseTimelineMarkers liest", () => {
    expect(timelineMarker("2401-03-14", "  Erstkontakt  ", "discovery")).toBe(
      "<!-- timeline: 2401-03-14 | Erstkontakt | discovery -->",
    );
  });

  it("ersetzt Trennstrich und Kommentar-Ende im Titel", () => {
    expect(timelineMarker("2401-03-14", "a | b", "other")).toContain("a / b");
    expect(timelineMarker("2401-03-14", "a --> b", "other")).toContain("a → b");
    // Auch drei Striche enden den Kommentar: „-->" darf danach nur noch
    // einmal vorkommen — als Ende der Marke selbst.
    const marke = timelineMarker("2401-03-14", "a ---> b", "other");
    expect(marke.match(/-->/g)).toHaveLength(1);
    expect(marke.endsWith("-->")).toBe(true);
  });
});
