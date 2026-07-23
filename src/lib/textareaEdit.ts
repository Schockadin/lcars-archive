// Reine DOM-Hilfsfunktionen für unkontrollierte Textareas (defaultValue statt
// value/onChange) — direkte Werteingriffe statt eines kontrollierten States,
// weil die Content-Textareas in dieser App bewusst unkontrolliert sind. Von
// MarkdownEditor.tsx (wrapSelection/applyLinePrefix/insertAtCursor) und
// TimelineMarkerButton.tsx (insertAtCursor) genutzt.

// Umschließt die aktuelle Selektion mit before/after (z.B. **fett**,
// *kursiv*, `Code`) — ohne Selektion wird stattdessen placeholder
// eingefügt und markiert, damit sofort weitergetippt werden kann. Die
// Selektion bleibt nach dem Einfügen auf dem umschlossenen Text (nicht nur
// dahinter wie bei insertAtCursor), damit ein zweiter Klick auf denselben
// Button die Markierung z.B. erneut anders formatieren kann.
export function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before,
  placeholder = "Text",
): void {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const hasSelection = end > start;
  const selected = hasSelection ? value.slice(start, end) : placeholder;

  textarea.value =
    value.slice(0, start) + before + selected + after + value.slice(end);

  const selStart = start + before.length;
  const selEnd = selStart + selected.length;
  textarea.setSelectionRange(selStart, selEnd);
  textarea.focus();
}

// Wendet prefixFn auf jede Zeile an, die die aktuelle Selektion berührt
// (für Überschrift/Liste/Zitat — mehrzeilig anwendbar). Ohne Selektion
// wirkt es nur auf die Zeile, in der der Cursor steht. prefixFn bekommt den
// 0-basierten Index innerhalb der betroffenen Zeilen (für nummerierte
// Listen, die hochzählen müssen).
export function applyLinePrefix(
  textarea: HTMLTextAreaElement,
  prefixFn: (lineIndex: number) => string,
): void {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const prefixed = lines.map((line, i) => `${prefixFn(i)}${line}`).join("\n");

  textarea.value = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  textarea.setSelectionRange(lineStart, lineStart + prefixed.length);
  textarea.focus();
}

// Fügt text an der aktuellen Cursor-Position ein (ersetzt eine vorhandene
// Selektion). Bei ownLine=true landet der eingefügte Text auf einer eigenen
// Zeile, unabhängig davon, wo genau der Cursor im Text steht — für Bausteine,
// die als Block erkennbar sein müssen (Zeitleisten-Marker in
// TimelineMarkerButton.tsx, eingefügte Bild-Markdown-Syntax in
// MarkdownEditor.tsx).
export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  text: string,
  { ownLine = false }: { ownLine?: boolean } = {},
): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);

  let insert = text;
  if (ownLine) {
    const leadingNewline =
      before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const trailingNewline =
      after.length > 0 && !after.startsWith("\n") ? "\n" : "";
    insert = `${leadingNewline}${text}${trailingNewline}`;
  }

  textarea.value = before + insert + after;
  const cursorPos = (before + insert).length;
  textarea.setSelectionRange(cursorPos, cursorPos);
  textarea.focus();
}
