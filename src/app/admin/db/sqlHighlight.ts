const SQL_KEYWORDS = new Set([
  "select", "from", "where", "and", "or", "not", "in", "is", "null", "as",
  "join", "left", "right", "inner", "outer", "full", "on", "group", "by",
  "order", "limit", "offset", "with", "union", "all", "distinct", "having",
  "case", "when", "then", "else", "end", "asc", "desc", "like", "ilike",
  "between", "exists", "count", "sum", "avg", "min", "max", "cast",
  "coalesce", "true", "false", "insert", "into", "values", "update", "set",
  "delete", "create", "alter", "drop", "table", "returning", "using",
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Reiner Text-Tokenizer für rudimentäres SQL-Syntaxhighlighting im freien
// Query-Feld auf /admin/db (SqlQueryPanel.tsx) — keine echte Grammatik
// (bewusst kein neues Dependency wie CodeMirror/Prism für ein einzelnes
// Admin-Textfeld), reicht aber für Kommentare/Strings/Zahlen/Keywords.
// Jedes Text-Fragment wird vor dem Einfügen escaped, das Ergebnis geht
// direkt in dangerouslySetInnerHTML — sicher, weil es nie fremden Content
// rendert, nur die eigene, bereits escapte Eingabe des Admins selbst.
const TOKEN_RE =
  /(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_][a-zA-Z0-9_]*)|(\s+)|([^\sa-zA-Z0-9_]+)/g;

export function highlightSql(text: string): string {
  let out = "";
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(text))) {
    const [, comment, str, num, word, ws, punct] = match;
    if (comment) {
      out += `<span class="sql-comment">${escapeHtml(comment)}</span>`;
    } else if (str) {
      out += `<span class="sql-string">${escapeHtml(str)}</span>`;
    } else if (num) {
      out += `<span class="sql-number">${escapeHtml(num)}</span>`;
    } else if (word) {
      out += SQL_KEYWORDS.has(word.toLowerCase())
        ? `<span class="sql-keyword">${escapeHtml(word)}</span>`
        : escapeHtml(word);
    } else if (ws) {
      out += escapeHtml(ws);
    } else if (punct) {
      out += escapeHtml(punct);
    }
  }
  return out;
}
