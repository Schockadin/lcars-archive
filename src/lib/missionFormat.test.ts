import { describe, it, expect } from "vitest";
import {
  fmtDate,
  periodLabel,
  yearOf,
  sessionLabel,
  byDateDesc,
  byDateAsc,
  stripHtml,
  synopsisExcerpt,
} from "./missionFormat";

describe("fmtDate", () => {
  it("formats an ISO date to DD.MM.YYYY", () => {
    expect(fmtDate("2400-09-15")).toBe("15.09.2400");
  });

  it("handles a datetime string by only using the date part", () => {
    expect(fmtDate("2400-09-15T12:34:56Z")).toBe("15.09.2400");
  });

  it("returns an empty string for null", () => {
    expect(fmtDate(null)).toBe("");
  });

  it("returns an empty string when a date part is missing", () => {
    expect(fmtDate("2400-09")).toBe("");
  });

  it("returns an empty string for an empty input", () => {
    expect(fmtDate("")).toBe("");
  });
});

describe("periodLabel", () => {
  it("joins start and end date", () => {
    expect(periodLabel("2400-01-01", "2400-01-31")).toBe(
      "01.01.2400 – 31.01.2400",
    );
  });

  it("uses LAUFEND for an open end date", () => {
    expect(periodLabel("2400-01-01", null)).toBe("01.01.2400 – LAUFEND");
  });

  it("falls back to just LAUFEND when start is also missing", () => {
    expect(periodLabel(null, null)).toBe("LAUFEND");
  });
});

describe("yearOf", () => {
  it("extracts the year from an ISO date", () => {
    expect(yearOf("2400-09-15")).toBe(2400);
  });

  it("returns null for null input", () => {
    expect(yearOf(null)).toBeNull();
  });

  it("returns null for a non-numeric year", () => {
    expect(yearOf("abcd-09-15")).toBeNull();
  });
});

describe("sessionLabel", () => {
  it("pads single-digit session numbers", () => {
    expect(sessionLabel(3)).toBe("S-03");
  });

  it("does not pad double-digit session numbers", () => {
    expect(sessionLabel(12)).toBe("S-12");
  });

  it("returns LOG for null", () => {
    expect(sessionLabel(null)).toBe("LOG");
  });

  it("treats 0 as a valid session number, not null", () => {
    expect(sessionLabel(0)).toBe("S-00");
  });
});

describe("byDateDesc / byDateAsc", () => {
  const a = { log_date: "2400-01-01" };
  const b = { log_date: "2400-06-01" };
  const noDate = { log_date: null };

  it("byDateDesc sorts newest first", () => {
    expect(byDateDesc(a, b)).toBeGreaterThan(0);
    expect(byDateDesc(b, a)).toBeLessThan(0);
    expect(byDateDesc(a, a)).toBe(0);
  });

  it("byDateAsc sorts oldest first", () => {
    expect(byDateAsc(a, b)).toBeLessThan(0);
    expect(byDateAsc(b, a)).toBeGreaterThan(0);
  });

  it("byDateDesc always sorts entries without a date to the end", () => {
    expect(byDateDesc(noDate, a)).toBeGreaterThan(0);
    expect(byDateDesc(a, noDate)).toBeLessThan(0);
  });

  it("byDateAsc also sorts entries without a date to the end", () => {
    expect(byDateAsc(noDate, a)).toBeGreaterThan(0);
    expect(byDateAsc(a, noDate)).toBeLessThan(0);
  });

  it("treats two missing dates as equal", () => {
    expect(byDateDesc(noDate, noDate)).toBe(0);
    expect(byDateAsc(noDate, noDate)).toBe(0);
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hallo <b>Welt</b></p>")).toBe("Hallo Welt");
  });

  it("collapses newlines/tabs between tags", () => {
    expect(stripHtml("<p>Zeile 1</p>\n\t<p>Zeile 2</p>")).toBe(
      "Zeile 1 Zeile 2",
    );
  });

  it("returns an empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("synopsisExcerpt", () => {
  it("returns the text unchanged when under the max length", () => {
    expect(synopsisExcerpt("Ein kurzer Text.")).toBe("Ein kurzer Text.");
  });

  it("flattens whitespace/paragraph breaks before measuring length", () => {
    expect(synopsisExcerpt("Zeile   1\n\nZeile 2")).toBe("Zeile 1 Zeile 2");
  });

  it("truncates at a word boundary and appends an ellipsis when over the max length", () => {
    const long = "Wort ".repeat(20).trim(); // 99 chars, plenty of spaces
    const result = synopsisExcerpt(long, 20);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    // must not cut a word in half
    expect(result.slice(0, -1).endsWith(" ")).toBe(false);
  });

  it("respects a custom maxLen", () => {
    const text = "abc def ghij klmno";
    expect(synopsisExcerpt(text, 8)).toBe("abc def…");
  });

  it("hard-cuts at maxLen when there is no word boundary in range", () => {
    // Ein einziger langer „Wort"-Block ohne Leerzeichen (URL/Token): früher gab
    // lastIndexOf(" ", maxLen) hier -1 zurück und slice(0, -1) lieferte fast den
    // gesamten Text statt zu kürzen.
    const long = "x".repeat(300);
    const result = synopsisExcerpt(long, 200);
    expect(result).toBe("x".repeat(200) + "…");
    expect(result.length).toBe(201);
  });

  it("hard-cuts at maxLen when the only space sits at index 0", () => {
    // Führendes Leerzeichen wird zwar getrimmt; ein Wort ohne weitere Grenzen
    // darf trotzdem nicht in einen (fast) leeren Anriss kollabieren.
    const text = "a" + "b".repeat(50);
    expect(synopsisExcerpt(text, 10)).toBe("a" + "b".repeat(9) + "…");
  });
});
