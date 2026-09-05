import { describe, expect, it } from "vitest";
import {
  logMetaLine,
  missionMetaLine,
} from "./CampaignBookPdfDocument";
import type { CampaignBookLog } from "@/lib/campaignBook";

// Die Kopfzeilen des Kampagnenbands: sie setzen sich aus dem zusammen, was am
// Inhalt bekannt ist — fehlende Angaben dürfen keine leeren Trenner
// hinterlassen.

function log(partial: Partial<CampaignBookLog>): CampaignBookLog {
  return {
    slug: "log",
    title: "Log",
    sessionNr: null,
    logDate: null,
    authorName: null,
    sourceMarkdown: "",
    visibility: "public",
    ...partial,
  };
}

describe("missionMetaLine", () => {
  it("zeigt Zeitraum, deutschen Status und die Anzahl der Logbücher", () => {
    expect(
      missionMetaLine({
        status: "completed",
        startedAt: "2401-03-05",
        endedAt: "2401-06-12",
        logs: [1, 2],
      }),
    ).toBe("05. März 2401 – 12. Juni 2401 · Abgeschlossen · 2 Logbücher");
  });

  it("nennt ein einzelnes Logbuch im Singular", () => {
    expect(
      missionMetaLine({
        status: null,
        startedAt: "2401-03-05",
        endedAt: null,
        logs: [1],
      }),
    ).toBe("05. März 2401 · 1 Logbuch");
  });

  it("lässt fehlende Angaben weg statt leere Trenner zu setzen", () => {
    expect(
      missionMetaLine({ status: null, startedAt: null, endedAt: null, logs: [] }),
    ).toBe("0 Logbücher");
  });

  it("gibt einen unbekannten Status unverändert weiter", () => {
    expect(
      missionMetaLine({
        status: "unbekannt",
        startedAt: null,
        endedAt: null,
        logs: [],
      }),
    ).toBe("unbekannt · 0 Logbücher");
  });

  it("nennt ein Datum nur einmal, wenn Anfang und Ende zusammenfallen", () => {
    expect(
      missionMetaLine({
        status: null,
        startedAt: "2401-03-05",
        endedAt: "2401-03-05",
        logs: [1],
      }),
    ).toBe("05. März 2401 · 1 Logbuch");
  });
});

describe("logMetaLine", () => {
  it("setzt Session, Datum und Autor zusammen", () => {
    expect(
      logMetaLine(log({ sessionNr: 3, logDate: "2401-06-14", authorName: "Tuvok" })),
    ).toBe("Session 3 · 14. Juni 2401 · Tuvok");
  });

  it("bleibt leer, wenn nichts davon bekannt ist", () => {
    expect(logMetaLine(log({}))).toBe("");
  });

  it("nimmt auch Session 0 mit (0 ist eine Nummer, kein Fehlen)", () => {
    expect(logMetaLine(log({ sessionNr: 0 }))).toBe("Session 0");
  });
});
