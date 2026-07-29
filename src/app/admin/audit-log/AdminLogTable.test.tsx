import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminLogTable, { type LogColumn } from "./AdminLogTable";

// Testdaten: 25 Zeilen „Zeile 0"…„Zeile 24" mit numerischem Sortierwert, damit
// die Standardsortierung (asc nach n) 0…24 ergibt.
interface Row {
  n: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 25 }, (_, n) => ({
  n,
  name: `Zeile ${n}`,
}));
const COLUMNS: LogColumn<Row>[] = [
  {
    key: "name",
    label: "Name",
    sortValue: (r) => r.n,
    filterValue: (r) => r.name,
    render: (r) => r.name,
  },
];

function renderTable() {
  return render(
    <AdminLogTable
      rows={ROWS}
      columns={COLUMNS}
      rowKey={(r) => r.n}
      emptyMessage="leer"
      defaultSortKey="name"
      defaultSortDir="asc"
    />,
  );
}

// Nur die Datenzeilen zählen (Namen „Zeile N") — Header/Filter zählen nicht mit.
const visibleRowNames = () =>
  screen.queryAllByText(/^Zeile \d+$/).map((el) => el.textContent);

describe("AdminLogTable – Paginierung", () => {
  it("zeigt standardmäßig 20 Einträge auf Seite 1", () => {
    renderTable();
    expect(visibleRowNames()).toHaveLength(20);
    expect(screen.getByText("Zeile 0")).toBeInTheDocument();
    expect(screen.getByText("Zeile 19")).toBeInTheDocument();
    expect(screen.queryByText("Zeile 20")).toBeNull();
  });

  it("blättert zur nächsten Seite und zeigt den Rest", () => {
    renderTable();
    fireEvent.click(screen.getByLabelText("Nächste Seite"));
    expect(visibleRowNames()).toHaveLength(5); // 25 - 20
    expect(screen.getByText("Zeile 20")).toBeInTheDocument();
    expect(screen.getByText("Zeile 24")).toBeInTheDocument();
    expect(screen.queryByText("Zeile 19")).toBeNull();
    // Auf der letzten Seite ist „Weiter" deaktiviert.
    expect(screen.getByLabelText("Nächste Seite")).toBeDisabled();
  });

  it("„Alle“ zeigt alle Einträge und blendet die Blätter-Navigation aus", () => {
    renderTable();
    fireEvent.change(screen.getByLabelText("Einträge pro Seite"), {
      target: { value: "all" },
    });
    expect(visibleRowNames()).toHaveLength(25);
    expect(screen.queryByLabelText("Nächste Seite")).toBeNull();
  });

  it("ein Spaltenfilter setzt auf Seite 1 zurück und grenzt ein", () => {
    renderTable();
    // Erst auf Seite 2 blättern …
    fireEvent.click(screen.getByLabelText("Nächste Seite"));
    // … dann filtern: „Zeile 1" matcht „Zeile 1" und „Zeile 10"…„Zeile 19"
    // (11 Treffer, passen auf Seite 1).
    fireEvent.change(screen.getByLabelText("Nach Name filtern"), {
      target: { value: "Zeile 1" },
    });
    const names = visibleRowNames();
    expect(names).toContain("Zeile 1");
    expect(names).toContain("Zeile 10");
    // Kein Eintrag ohne „1" in der Zahl.
    expect(names).not.toContain("Zeile 2");
    // Zurück auf Seite 1 (erste Seite der gefilterten Treffer).
    expect(screen.getByText("Zeile 1")).toBeInTheDocument();
  });
});
