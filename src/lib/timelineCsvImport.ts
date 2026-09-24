export interface TimelineCsvRow {
  line: number;
  date: string;
  title: string;
  teaser: string;
  detail: string;
  characterNames: string[];
}

export class TimelineCsvError extends Error {}

export const TIMELINE_CSV_HEADER = "Datum;Titel;Teaser;Text;Charaktere";
export const TIMELINE_CSV_TEMPLATE_FILENAME = "chronologie-events-vorlage.csv";
export const TIMELINE_CSV_TEMPLATE = `${TIMELINE_CSV_HEADER}\r\n# Kommentar: Eine Datenzeile pro Event. Datum im Format JJJJ-MM-TT. Mehrere Charaktere mit Komma trennen.\r\n`;

const EXPECTED_HEADER = TIMELINE_CSV_HEADER.toLowerCase().split(";");

function rowsOf(input: string): { line: number; cells: string[] }[] {
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const pushRow = () => {
    cells.push(cell);
    rows.push({ line: rowLine, cells });
    cells = [];
    cell = "";
    rowLine = line;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
        if (char === "\n") line += 1;
      }
      continue;
    }
    if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === ";") {
      cells.push(cell);
      cell = "";
    } else if (char === "\n") {
      pushRow();
      line += 1;
      rowLine = line;
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (quoted)
    throw new TimelineCsvError(
      "Nicht geschlossenes Anführungszeichen in der CSV-Datei.",
    );
  if (cell !== "" || cells.length > 0) pushRow();
  return rows;
}

export function parseTimelineCsv(input: string): TimelineCsvRow[] {
  const rows = rowsOf(input.replace(/^\uFEFF/, "")).filter((row) =>
    row.cells.some((cell) => cell.trim() !== ""),
  );
  const header = rows.shift();
  if (!header) throw new TimelineCsvError("Die CSV-Datei ist leer.");
  const normalized = header.cells.map((cell) => cell.trim().toLowerCase());
  if (
    normalized.length !== EXPECTED_HEADER.length ||
    normalized.some((cell, index) => cell !== EXPECTED_HEADER[index])
  ) {
    throw new TimelineCsvError(
      "Die Kopfzeile muss Datum;Titel;Teaser;Text;Charaktere lauten.",
    );
  }

  return rows
    .filter((row) => !row.cells[0]?.trimStart().startsWith("#"))
    .map((row) => {
      if (row.cells.length !== EXPECTED_HEADER.length) {
        throw new TimelineCsvError(
          `Zeile ${row.line}: Erwartet werden fünf mit Semikolon getrennte Spalten.`,
        );
      }
      const [date, title, teaser, detail, characters] = row.cells.map((cell) =>
        cell.trim(),
      );
      return {
        line: row.line,
        date,
        title,
        teaser,
        detail,
        characterNames: characters
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
      };
    });
}
