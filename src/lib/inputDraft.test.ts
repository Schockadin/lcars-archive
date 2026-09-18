import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  INPUT_DRAFT_MAX_FIELDS,
  INPUT_DRAFT_MAX_VALUE_LENGTH,
  applyFieldValue,
  clearAllDraftRecords,
  clearAllInputDrafts,
  clearDraftRecord,
  draftFieldKey,
  draftFieldKeys,
  draftStorageKey,
  isDraftableField,
  isFieldAtDefault,
  parseDraftRecord,
  readDraftRecord,
  readDefaultFieldValue,
  readFieldValue,
  withDraftValue,
  withKnownDraftValue,
  writeDraftRecord,
  type DraftField,
  type DraftRecord,
} from "./inputDraft";

// Hilfsmittel: ein Stück Markup in den Testkörper hängen und wieder abräumen.
function mount(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("isDraftableField", () => {
  it("nimmt Text-, Auswahl- und Mehrzeilenfelder", () => {
    const host = mount(`
      <input id="a" type="text">
      <textarea id="b"></textarea>
      <select id="c"><option value="x">x</option></select>
      <input id="d" type="checkbox">
    `);
    for (const id of ["a", "b", "c", "d"])
      expect(isDraftableField(host.querySelector(`#${id}`))).toBe(true);
  });

  it("lässt Passwörter, Einmalcodes und Zahlungsdaten aus", () => {
    const host = mount(`
      <input id="pw" type="password">
      <input id="otp" type="text" autocomplete="one-time-code">
      <input id="cc" type="text" autocomplete="cc-number">
      <input id="shown" type="text" autocomplete="current-password">
    `);
    for (const id of ["pw", "otp", "cc", "shown"])
      expect(isDraftableField(host.querySelector(`#${id}`))).toBe(false);
  });

  it("lässt technische Feldtypen aus", () => {
    const host = mount(`
      <input id="h" type="hidden" value="x">
      <input id="f" type="file">
      <input id="s" type="submit">
      <input id="b" type="button">
    `);
    for (const id of ["h", "f", "s", "b"])
      expect(isDraftableField(host.querySelector(`#${id}`))).toBe(false);
  });

  it("achtet data-no-draft am Feld wie am Vorfahren", () => {
    const host = mount(`
      <input id="self" type="text" data-no-draft>
      <div data-no-draft><input id="parent" type="text"></div>
      <div><input id="free" type="text"></div>
    `);
    expect(isDraftableField(host.querySelector("#self"))).toBe(false);
    expect(isDraftableField(host.querySelector("#parent"))).toBe(false);
    expect(isDraftableField(host.querySelector("#free"))).toBe(true);
  });

  it("weist Nicht-Formularelemente ab", () => {
    const host = mount(`<div id="x"></div>`);
    expect(isDraftableField(host.querySelector("#x"))).toBe(false);
    expect(isDraftableField(null)).toBe(false);
  });
});

describe("draftFieldKeys", () => {
  it("benennt Felder nach Formular und name", () => {
    mount(`
      <form id="reply"><textarea name="body"></textarea></form>
    `);
    const keys = draftFieldKeys(document);
    const field = document.querySelector("textarea") as DraftField;
    expect(keys.get(field)).toBe("form#reply|n:body");
  });

  it("trennt gleichnamige Felder zweier Formulare", () => {
    mount(`
      <form id="one"><input name="title" value=""></form>
      <form id="two"><input name="title" value=""></form>
    `);
    const keys = draftFieldKeys(document);
    const [a, b] = Array.from(
      document.querySelectorAll("input"),
    ) as DraftField[];
    expect(keys.get(a)).toBe("form#one|n:title");
    expect(keys.get(b)).toBe("form#two|n:title");
    expect(keys.get(a)).not.toBe(keys.get(b));
  });

  it("unterscheidet die Kästchen einer Gruppe über ihren value", () => {
    mount(`
      <form id="f">
        <input type="checkbox" name="tag" value="a">
        <input type="checkbox" name="tag" value="b">
      </form>
    `);
    const keys = Array.from(draftFieldKeys(document).values());
    expect(keys).toEqual(["form#f|n:tag=a", "form#f|n:tag=b"]);
  });

  it("weicht ohne name auf die id und zuletzt auf die Position aus", () => {
    mount(`
      <form id="f">
        <input id="titel" type="text">
        <input type="text">
        <input type="text">
      </form>
    `);
    const keys = Array.from(draftFieldKeys(document).values());
    expect(keys).toEqual([
      "form#f|i:titel",
      "form#f|o:input:1",
      "form#f|o:input:2",
    ]);
  });

  it("gibt Feldern ohne Formular den Namensraum der Seite", () => {
    mount(`<input name="filter" type="search">`);
    const field = document.querySelector("input") as DraftField;
    expect(draftFieldKeys(document).get(field)).toBe("doc|n:filter");
  });

  // Regression: Unter „Meine Inhalte" steht je Zeile ein namenloses
  // Auswahlfeld (Entwurf/Veröffentlicht) — ohne Formular. Deren einziger
  // Schlüssel wäre die Position im Dokument, und die zeigt nach jedem Filtern,
  // Sortieren oder Nachladen auf eine ANDERE Zeile. Der gesicherte Stand
  // landete so im falschen Feld und löste dort eine echte Server-Action aus:
  // aus fremden Entwürfen wurden veröffentlichte Inhalte.
  it("übergeht formularlose Felder ohne name und ohne id", () => {
    mount(`
      <div>
        <select><option value="draft">E</option></select>
        <select id="mit-id"><option value="draft">E</option></select>
        <select name="mit-name"><option value="draft">E</option></select>
      </div>
    `);
    const keys = Array.from(draftFieldKeys(document).values());
    expect(keys).toEqual(["doc|i:mit-id", "doc|n:mit-name"]);
  });

  // Innerhalb eines Formulars bleibt die Position der Ausweg — dort steht die
  // Felderliste fest (siehe den Test weiter oben).
  it("behält namenlose Felder innerhalb eines Formulars", () => {
    mount(`<form id="f"><input type="text"></form>`);
    const keys = Array.from(draftFieldKeys(document).values());
    expect(keys).toEqual(["form#f|o:input:0"]);
  });

  it("übergeht abgewählte Felder ganz", () => {
    mount(`
      <form id="f">
        <input name="a" type="text">
        <input name="pw" type="password">
      </form>
    `);
    expect(Array.from(draftFieldKeys(document).values())).toEqual([
      "form#f|n:a",
    ]);
  });

  it("draftFieldKey liefert denselben Schlüssel wie der Gesamtdurchgang", () => {
    mount(`
      <form id="f"><input type="text"><input id="zwei" type="text"></form>
    `);
    const fields = Array.from(
      document.querySelectorAll("input"),
    ) as DraftField[];
    const all = draftFieldKeys(document);
    for (const field of fields)
      expect(draftFieldKey(field)).toBe(all.get(field));
  });

  it("draftFieldKey gibt für abgewählte Felder null", () => {
    mount(`<input type="password">`);
    expect(draftFieldKey(document.querySelector("input")!)).toBeNull();
  });
});

describe("readFieldValue / applyFieldValue", () => {
  it("sichert und setzt Text", () => {
    mount(`<textarea>Hallo</textarea>`);
    const field = document.querySelector("textarea") as DraftField;
    expect(readFieldValue(field)).toEqual({ kind: "text", value: "Hallo" });
    expect(applyFieldValue(field, { kind: "text", value: "Neu" })).toBe(true);
    expect((field as HTMLTextAreaElement).value).toBe("Neu");
  });

  it("meldet false, wenn der Wert schon steht", () => {
    mount(`<input type="text" value="gleich">`);
    const field = document.querySelector("input") as DraftField;
    expect(applyFieldValue(field, { kind: "text", value: "gleich" })).toBe(
      false,
    );
  });

  it("löst beim Setzen ein input-Event aus (kontrollierte Felder)", () => {
    mount(`<input type="text">`);
    const field = document.querySelector("input") as HTMLInputElement;
    let seen = "";
    field.addEventListener("input", (e) => {
      seen = (e.target as HTMLInputElement).value;
    });
    applyFieldValue(field, { kind: "text", value: "getippt" });
    expect(seen).toBe("getippt");
  });

  it("sichert und setzt Kästchen", () => {
    mount(`<input type="checkbox" checked>`);
    const field = document.querySelector("input") as DraftField;
    expect(readFieldValue(field)).toEqual({ kind: "checked", value: true });
    expect(applyFieldValue(field, { kind: "checked", value: false })).toBe(
      true,
    );
    expect((field as HTMLInputElement).checked).toBe(false);
  });

  it("meldet ein gesetztes Kästchen als change (kontrollierte Felder)", () => {
    // Wie beim value läuft das Setzen über den nativen Prototyp-Setter: React
    // führt .checked über dieselbe Setter-Falle, eine direkte Zuweisung bliebe
    // einem kontrollierten Kästchen verborgen.
    mount(`<input type="checkbox">`);
    const field = document.querySelector("input") as HTMLInputElement;
    let seen: boolean | null = null;
    field.addEventListener("change", (e) => {
      seen = (e.target as HTMLInputElement).checked;
    });
    applyFieldValue(field, { kind: "checked", value: true });
    expect(seen).toBe(true);
  });

  it("sichert und setzt Mehrfachauswahlen", () => {
    mount(`
      <select multiple>
        <option value="a">a</option>
        <option value="b" selected>b</option>
        <option value="c">c</option>
      </select>
    `);
    const field = document.querySelector("select") as DraftField;
    expect(readFieldValue(field)).toEqual({ kind: "multi", value: ["b"] });
    expect(applyFieldValue(field, { kind: "multi", value: ["a", "c"] })).toBe(
      true,
    );
    expect(readFieldValue(field)).toEqual({ kind: "multi", value: ["a", "c"] });
  });

  it("setzt nichts, wenn die Gestalt nicht zum Feld passt", () => {
    mount(`<input type="text"><input id="cb" type="checkbox">`);
    const text = document.querySelector("input") as DraftField;
    const box = document.querySelector("#cb") as DraftField;
    expect(applyFieldValue(text, { kind: "checked", value: true })).toBe(false);
    expect(applyFieldValue(box, { kind: "text", value: "x" })).toBe(false);
    expect(applyFieldValue(text, { kind: "multi", value: ["x"] })).toBe(false);
  });
});

describe("readDefaultFieldValue / isFieldAtDefault", () => {
  it("liest den vom Server gelieferten Stand, nicht den aktuellen", () => {
    mount(`<textarea>Vom Server</textarea>`);
    const field = document.querySelector("textarea") as HTMLTextAreaElement;
    field.value = "Inzwischen getippt";
    expect(readDefaultFieldValue(field)).toEqual({
      kind: "text",
      value: "Vom Server",
    });
    expect(isFieldAtDefault(field)).toBe(false);
  });

  it("erkennt ein unberührtes Feld", () => {
    mount(`
      <input id="t" type="text" value="Vorgabe">
      <input id="c" type="checkbox" checked>
      <select id="m" multiple>
        <option value="a" selected>a</option>
        <option value="b">b</option>
      </select>
    `);
    for (const id of ["t", "c", "m"])
      expect(
        isFieldAtDefault(document.querySelector(`#${id}`) as DraftField),
      ).toBe(true);
  });

  it("erkennt ein angefasstes Kästchen und eine geänderte Auswahl", () => {
    mount(`
      <input id="c" type="checkbox" checked>
      <select id="m" multiple>
        <option value="a" selected>a</option>
        <option value="b">b</option>
      </select>
    `);
    const box = document.querySelector("#c") as HTMLInputElement;
    box.checked = false;
    expect(isFieldAtDefault(box)).toBe(false);

    const select = document.querySelector("#m") as HTMLSelectElement;
    select.options[1].selected = true;
    expect(isFieldAtDefault(select)).toBe(false);
    expect(readDefaultFieldValue(select)).toEqual({
      kind: "multi",
      value: ["a"],
    });
  });
});

describe("parseDraftRecord", () => {
  it("liest gültige Datensätze", () => {
    const raw = JSON.stringify({
      a: { kind: "text", value: "x" },
      b: { kind: "checked", value: true },
      c: { kind: "multi", value: ["p", "q"] },
    });
    expect(parseDraftRecord(raw)).toEqual({
      a: { kind: "text", value: "x" },
      b: { kind: "checked", value: true },
      c: { kind: "multi", value: ["p", "q"] },
    });
  });

  it("verträgt Unsinn und sortiert fremde Einträge aus", () => {
    expect(parseDraftRecord(null)).toEqual({});
    expect(parseDraftRecord("kein json")).toEqual({});
    expect(parseDraftRecord("[1,2]")).toEqual({});
    expect(
      parseDraftRecord(
        JSON.stringify({
          gut: { kind: "text", value: "ja" },
          falsch: { kind: "text", value: 7 },
          unbekannt: { kind: "datei", value: "x" },
          leer: null,
        }),
      ),
    ).toEqual({ gut: { kind: "text", value: "ja" } });
  });
});

describe("withDraftValue", () => {
  it("nimmt neue Werte auf und lässt den Datensatz unangetastet, wenn nichts neu ist", () => {
    const record: DraftRecord = { a: { kind: "text", value: "x" } };
    const next = withDraftValue(record, "b", { kind: "text", value: "y" });
    expect(next).toEqual({
      a: { kind: "text", value: "x" },
      b: { kind: "text", value: "y" },
    });
    expect(withDraftValue(next, "a", { kind: "text", value: "x" })).toBe(next);
    expect(withDraftValue(next, "b", { kind: "multi", value: [] })).not.toBe(
      next,
    );
  });

  it("sichert überlange Texte nicht und räumt einen alten Stand weg", () => {
    const lang = "x".repeat(INPUT_DRAFT_MAX_VALUE_LENGTH + 1);
    expect(withDraftValue({}, "a", { kind: "text", value: lang })).toEqual({});
    const record: DraftRecord = { a: { kind: "text", value: "kurz" } };
    expect(withDraftValue(record, "a", { kind: "text", value: lang })).toEqual(
      {},
    );
  });

  it("nimmt jenseits der Feldgrenze nur noch bekannte Felder an", () => {
    let record: DraftRecord = {};
    for (let i = 0; i < INPUT_DRAFT_MAX_FIELDS; i++)
      record = withDraftValue(record, `f${i}`, { kind: "text", value: "x" });
    expect(Object.keys(record)).toHaveLength(INPUT_DRAFT_MAX_FIELDS);
    expect(withDraftValue(record, "neu", { kind: "text", value: "y" })).toBe(
      record,
    );
    const updated = withDraftValue(record, "f0", {
      kind: "text",
      value: "geändert",
    });
    expect(updated.f0).toEqual({ kind: "text", value: "geändert" });
  });
});

describe("withKnownDraftValue", () => {
  it("führt einen bekannten Stand nach", () => {
    const record: DraftRecord = { a: { kind: "text", value: "alt" } };
    expect(
      withKnownDraftValue(record, "a", { kind: "text", value: "" }),
    ).toEqual({ a: { kind: "text", value: "" } });
  });

  it("nimmt ein unberührtes Feld NICHT auf", () => {
    // Der Fall, für den es die Funktion gibt: Ein nur geöffnetes
    // Bearbeiten-Formular darf beim Tab-Wechsel nicht seine serverseitigen
    // Vorgabewerte sichern und sie später über geänderte Inhalte legen.
    const record: DraftRecord = {};
    expect(
      withKnownDraftValue(record, "unberührt", {
        kind: "text",
        value: "Vorgabe vom Server",
      }),
    ).toBe(record);
  });
});

describe("Speicher-Zugriff", () => {
  let storage: Storage;

  beforeEach(() => {
    const data = new Map<string, string>();
    storage = {
      get length() {
        return data.size;
      },
      key: (i: number) => Array.from(data.keys())[i] ?? null,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
    } as Storage;
  });

  it("trennt die Entwürfe zweier Seiten", () => {
    expect(draftStorageKey("/dialogues/abc")).not.toBe(
      draftStorageKey("/user"),
    );
    writeDraftRecord(storage, "/a", { k: { kind: "text", value: "A" } });
    writeDraftRecord(storage, "/b", { k: { kind: "text", value: "B" } });
    expect(readDraftRecord(storage, "/a").k).toEqual({
      kind: "text",
      value: "A",
    });
    expect(readDraftRecord(storage, "/b").k).toEqual({
      kind: "text",
      value: "B",
    });
  });

  it("entfernt den Eintrag, wenn nichts mehr zu sichern ist", () => {
    writeDraftRecord(storage, "/a", { k: { kind: "text", value: "A" } });
    writeDraftRecord(storage, "/a", {});
    expect(storage.getItem(draftStorageKey("/a"))).toBeNull();
  });

  it("clearDraftRecord räumt nur die eine Seite ab", () => {
    writeDraftRecord(storage, "/a", { k: { kind: "text", value: "A" } });
    writeDraftRecord(storage, "/b", { k: { kind: "text", value: "B" } });
    clearDraftRecord(storage, "/a");
    expect(readDraftRecord(storage, "/a")).toEqual({});
    expect(readDraftRecord(storage, "/b")).not.toEqual({});
  });

  it("clearAllDraftRecords lässt fremde Schlüssel stehen", () => {
    writeDraftRecord(storage, "/a", { k: { kind: "text", value: "A" } });
    storage.setItem("neo_theme", "standard");
    clearAllDraftRecords(storage);
    expect(readDraftRecord(storage, "/a")).toEqual({});
    expect(storage.getItem("neo_theme")).toBe("standard");
  });

  it("clearAllInputDrafts räumt den Sitzungsspeicher des Browsers ab", () => {
    // Beim An- und Abmelden aufgerufen (HeaderUserNav, LoginForm): Auf einem
    // geteilten Gerät darf die nächste Person die Entwürfe der vorigen nicht
    // vorfinden. Fremde Schlüssel bleiben auch hier unangetastet.
    window.sessionStorage.setItem(
      draftStorageKey("/user"),
      JSON.stringify({ k: { kind: "text", value: "geheim genug" } }),
    );
    window.sessionStorage.setItem("etwas_anderes", "bleibt");

    clearAllInputDrafts();

    expect(readDraftRecord(window.sessionStorage, "/user")).toEqual({});
    expect(window.sessionStorage.getItem("etwas_anderes")).toBe("bleibt");
    window.sessionStorage.clear();
  });

  it("scheitert still, wenn der Speicher nicht mitspielt", () => {
    const broken = {
      getItem: () => {
        throw new Error("nope");
      },
      setItem: () => {
        throw new Error("voll");
      },
      removeItem: () => {
        throw new Error("nope");
      },
      key: () => null,
      length: 0,
      clear: () => {},
    } as unknown as Storage;
    expect(readDraftRecord(broken, "/a")).toEqual({});
    expect(
      writeDraftRecord(broken, "/a", { k: { kind: "text", value: "x" } }),
    ).toBe(false);
    expect(() => clearDraftRecord(broken, "/a")).not.toThrow();
    expect(() => clearAllDraftRecords(broken)).not.toThrow();
    expect(readDraftRecord(null, "/a")).toEqual({});
    expect(writeDraftRecord(undefined, "/a", {})).toBe(false);
  });
});
