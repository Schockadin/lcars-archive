// Entwurfs-Speicher für Eingabefelder („Drafts"): Jede Eingabe wird zusammen
// mit ihrem Feld für die Dauer der Browser-Sitzung (sessionStorage) gesichert
// und beim erneuten Aufruf derselben Seite wieder eingesetzt. Damit geht bei
// einem Reload, einem Fehlerbildschirm oder einem versehentlichen Zurück
// nichts mehr verloren.
//
// Dieses Modul ist bewusst REACT- und DOM-EVENT-frei: es enthält nur die
// reinen Regeln (welches Feld wird gesichert, unter welchem Schlüssel, wie
// wird gelesen/gesetzt/serialisiert). Die Verdrahtung mit dem Dokument macht
// src/components/lcars/InputDraftKeeper.tsx. So bleiben die Regeln unter
// Vitest testbar, ohne eine React-Komponente zu montieren.
//
// Nicht gesichert werden Felder, die entweder ihrer Natur nach geheim sind
// (Passwörter, Einmalcodes, Zahlungsdaten), technisch nichts mit Eingabe zu
// tun haben (hidden/file/submit/…), oder ausdrücklich abgewählt wurden —
// dafür genügt data-no-draft am Feld oder an einem beliebigen Vorfahren
// (z.B. am ganzen Formular).

export const INPUT_DRAFT_STORAGE_PREFIX = "neo_draft:";
export const INPUT_DRAFT_OPT_OUT_ATTR = "data-no-draft";

// Obergrenzen, damit ein einzelner Riesen-Text bzw. eine Seite mit sehr
// vielen Feldern den Sitzungsspeicher nicht sprengt (QuotaExceededError).
export const INPUT_DRAFT_MAX_VALUE_LENGTH = 50_000;
export const INPUT_DRAFT_MAX_FIELDS = 300;

export type DraftField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

// Drei Gestalten, mehr braucht ein Formularfeld nicht: Text (input/textarea/
// einfaches select), an/aus (checkbox/radio) und Mehrfachauswahl (select
// multiple).
export type DraftValue =
  | { kind: "text"; value: string }
  | { kind: "checked"; value: boolean }
  | { kind: "multi"; value: string[] };

export type DraftRecord = Record<string, DraftValue>;

// input-Typen, die entweder geheim sind oder gar keine Nutzereingabe tragen.
const SKIPPED_INPUT_TYPES = new Set([
  "password",
  "hidden",
  "file",
  "submit",
  "reset",
  "button",
  "image",
]);

// autocomplete-Kennungen, die sensible Inhalte ankündigen. Ein Feld mit
// type="text" kann über autocomplete trotzdem ein Einmalcode oder eine
// Kartennummer sein.
const SKIPPED_AUTOCOMPLETE = [
  "current-password",
  "new-password",
  "one-time-code",
  "cc-number",
  "cc-csc",
  "cc-exp",
  "cc-name",
];

export function isDraftField(el: Element | null): el is DraftField {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

// Darf dieses Feld gesichert werden? Prüft Typ, autocomplete und die
// Abwahl per data-no-draft (am Feld oder an einem Vorfahren).
export function isDraftableField(el: Element | null): el is DraftField {
  if (!isDraftField(el)) return false;
  if (el.closest(`[${INPUT_DRAFT_OPT_OUT_ATTR}]`)) return false;
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (SKIPPED_INPUT_TYPES.has(input.type)) return false;
  }
  const autocomplete = (el.getAttribute("autocomplete") ?? "").toLowerCase();
  if (autocomplete) {
    const tokens = autocomplete.split(/\s+/);
    if (tokens.some((token) => SKIPPED_AUTOCOMPLETE.includes(token)))
      return false;
  }
  return true;
}

// Welchem Formular gehört das Feld? Bevorzugt eine vom Markup vergebene,
// über Reloads stabile Kennung (id, name); sonst die Position unter den
// Formularen des Dokuments. Felder ohne Formular teilen sich den Namensraum
// „doc" der Seite.
function formScopeKey(el: DraftField): string {
  const form = el.form;
  if (!form) return "doc";
  if (form.id) return `form#${form.id}`;
  if (form.name) return `form@${form.name}`;
  const forms = Array.from(el.ownerDocument.forms);
  return `form[${forms.indexOf(form)}]`;
}

// Kennung des Feldes innerhalb seines Formulars. name ist der Normalfall
// (jedes Feld, das an eine Server-Action geht, hat einen), id die zweite
// Wahl, die laufende Nummer der letzte Ausweg. Bei checkbox/radio gehört der
// value dazu: eine Gruppe teilt sich einen name.
function fieldIdentityKey(el: DraftField, ordinal: number): string {
  const base = el.getAttribute("name")
    ? `n:${el.getAttribute("name")}`
    : el.id
      ? `i:${el.id}`
      : `o:${el.tagName.toLowerCase()}:${ordinal}`;
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.type === "checkbox" || input.type === "radio")
      return `${base}=${input.value}`;
  }
  return base;
}

// Alle sicherbaren Felder unterhalb von root mit ihrem Speicher-Schlüssel.
// Wird in einem Durchgang berechnet, weil die laufende Nummer (Ausweg für
// namenlose Felder) nur im Zusammenhang aller Felder eines Formulars stabil
// bestimmbar ist.
export function draftFieldKeys(root: ParentNode): Map<DraftField, string> {
  const keys = new Map<DraftField, string>();
  const counters = new Map<string, number>();
  const candidates = Array.from(
    root.querySelectorAll("input, textarea, select"),
  );
  for (const el of candidates) {
    if (!isDraftableField(el)) continue;
    const scope = formScopeKey(el);
    const counterKey = `${scope}|${el.tagName}`;
    const ordinal = counters.get(counterKey) ?? 0;
    counters.set(counterKey, ordinal + 1);
    keys.set(el, `${scope}|${fieldIdentityKey(el, ordinal)}`);
  }
  return keys;
}

// Schlüssel eines einzelnen Feldes (für das Speichern beim Tippen). Sucht
// vom Formular bzw. vom Dokument aus, damit dieselbe laufende Nummer
// herauskommt wie beim Wiederherstellen.
export function draftFieldKey(el: Element): string | null {
  if (!isDraftableField(el)) return null;
  const root: ParentNode = el.form ?? el.ownerDocument;
  return draftFieldKeys(root).get(el) ?? null;
}

export function readFieldValue(el: DraftField): DraftValue {
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.type === "checkbox" || input.type === "radio")
      return { kind: "checked", value: input.checked };
  }
  if (el.tagName === "SELECT") {
    const select = el as HTMLSelectElement;
    if (select.multiple)
      return {
        kind: "multi",
        value: Array.from(select.selectedOptions).map((o) => o.value),
      };
  }
  return { kind: "text", value: (el as HTMLInputElement).value };
}

// Einen gesicherten Wert in das Feld zurückschreiben. Gibt zurück, ob dabei
// etwas verändert wurde (unverändert ⇒ kein Event, kein Rendern).
//
// React-kontrollierte Felder merken eine direkte value-Zuweisung nicht: React
// hängt einen eigenen Setter davor und vergleicht beim nächsten Rendern gegen
// seinen State. Deshalb wird über den nativen Prototyp-Setter geschrieben und
// anschließend ein input-Event ausgelöst — genau der Weg, den auch
// Testing-Library für „user types" nimmt.
export function applyFieldValue(el: DraftField, value: DraftValue): boolean {
  if (value.kind === "checked") {
    const input = el as HTMLInputElement;
    if (el.tagName !== "INPUT") return false;
    if (input.type !== "checkbox" && input.type !== "radio") return false;
    if (input.checked === value.value) return false;
    input.checked = value.value;
    dispatchFieldEvents(el);
    return true;
  }
  if (value.kind === "multi") {
    if (el.tagName !== "SELECT") return false;
    const select = el as HTMLSelectElement;
    const wanted = new Set(value.value);
    let changed = false;
    for (const option of Array.from(select.options)) {
      const next = wanted.has(option.value);
      if (option.selected !== next) {
        option.selected = next;
        changed = true;
      }
    }
    if (changed) dispatchFieldEvents(el);
    return changed;
  }
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.type === "checkbox" || input.type === "radio") return false;
  }
  const field = el as HTMLInputElement;
  if (field.value === value.value) return false;
  setNativeValue(field, value.value);
  dispatchFieldEvents(el);
  return true;
}

function setNativeValue(el: HTMLInputElement, value: string) {
  const prototype =
    el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : el.tagName === "SELECT"
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function dispatchFieldEvents(el: DraftField) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// ── Speicher-Zugriff ─────────────────────────────────────────────────
// Ein Datensatz je Seitenpfad: so bleiben die Entwürfe zweier Seiten
// getrennt, und eine Seite lässt sich auf einen Schlag leeren.

export function draftStorageKey(pathname: string): string {
  return `${INPUT_DRAFT_STORAGE_PREFIX}${pathname || "/"}`;
}

export function parseDraftRecord(raw: string | null): DraftRecord {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const record: DraftRecord = {};
  for (const [key, value] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    const normalized = normalizeDraftValue(value);
    if (normalized) record[key] = normalized;
  }
  return record;
}

// Fremde/veraltete Einträge still aussortieren, statt beim Wiederherstellen
// über sie zu stolpern.
function normalizeDraftValue(value: unknown): DraftValue | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { kind?: unknown; value?: unknown };
  if (candidate.kind === "text" && typeof candidate.value === "string")
    return { kind: "text", value: candidate.value };
  if (candidate.kind === "checked" && typeof candidate.value === "boolean")
    return { kind: "checked", value: candidate.value };
  if (
    candidate.kind === "multi" &&
    Array.isArray(candidate.value) &&
    candidate.value.every((v) => typeof v === "string")
  )
    return { kind: "multi", value: candidate.value as string[] };
  return null;
}

export function serializeDraftRecord(record: DraftRecord): string {
  return JSON.stringify(record);
}

// Einen Wert in den Datensatz aufnehmen — unter Beachtung der Obergrenzen.
// Ein zu langer Text und ein voller Datensatz führen nicht zum Fehler,
// sondern dazu, dass dieses eine Feld eben nicht gesichert wird (ein bereits
// gesicherter Stand dafür wird entfernt, damit nichts Veraltetes stehen
// bleibt).
export function withDraftValue(
  record: DraftRecord,
  key: string,
  value: DraftValue,
): DraftRecord {
  const tooLong =
    value.kind === "text" && value.value.length > INPUT_DRAFT_MAX_VALUE_LENGTH;
  if (tooLong) {
    if (!(key in record)) return record;
    const next = { ...record };
    delete next[key];
    return next;
  }
  if (!(key in record) && Object.keys(record).length >= INPUT_DRAFT_MAX_FIELDS)
    return record;
  const existing = record[key];
  if (existing && sameDraftValue(existing, value)) return record;
  return { ...record, [key]: value };
}

function sameDraftValue(a: DraftValue, b: DraftValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "multi" && b.kind === "multi")
    return (
      a.value.length === b.value.length &&
      a.value.every((v, i) => v === b.value[i])
    );
  return a.value === b.value;
}

// sessionStorage kann werfen (privater Modus, gesperrte Websitedaten, volles
// Kontingent). Kein Entwurf ist nie ein Grund, die Seite scheitern zu lassen.
export function readDraftRecord(
  storage: Storage | null | undefined,
  pathname: string,
): DraftRecord {
  if (!storage) return {};
  try {
    return parseDraftRecord(storage.getItem(draftStorageKey(pathname)));
  } catch {
    return {};
  }
}

export function writeDraftRecord(
  storage: Storage | null | undefined,
  pathname: string,
  record: DraftRecord,
): boolean {
  if (!storage) return false;
  const key = draftStorageKey(pathname);
  try {
    if (Object.keys(record).length === 0) storage.removeItem(key);
    else storage.setItem(key, serializeDraftRecord(record));
    return true;
  } catch {
    // Volles Kontingent: lieber den Entwurf dieser Seite wegwerfen als in
    // jedem Tastendruck erneut scheitern.
    try {
      storage.removeItem(key);
    } catch {}
    return false;
  }
}

export function clearDraftRecord(
  storage: Storage | null | undefined,
  pathname: string,
): void {
  if (!storage) return;
  try {
    storage.removeItem(draftStorageKey(pathname));
  } catch {}
}

// Alle Entwürfe aller Seiten verwerfen (z.B. beim Abmelden).
export function clearAllDraftRecords(storage: Storage | null | undefined) {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(INPUT_DRAFT_STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {}
}

// Dasselbe für den Browser, ohne dass die Aufrufstelle an den Speicher
// herankommen muss: beim An- UND Abmelden aufgerufen (siehe HeaderUserNav,
// LoginForm — dieselbe Stelle, an der auch der Offline-Seiten-Cache geleert
// wird). Auf einem geteilten Gerät soll die nächste Person weder die Entwürfe
// der vorigen sehen noch die eigenen hinterlassen.
export function clearAllInputDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    clearAllDraftRecords(window.sessionStorage);
  } catch {
    // Kein Zugriff auf den Sitzungsspeicher — dann gibt es dort auch nichts.
  }
}
