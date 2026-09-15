// Erkennt die Render-Fehler, die React selbst wieder auffängt — sie gehören
// nicht ins Fehlerprotokoll (src/lib/errorLog.ts), weil sie keinen Absturz
// beschreiben.
//
// Der konkrete Anlass ist eine Meldung, die seit einiger Zeit regelmäßig als
// „Server Action" auf „/" im Protokoll auftauchte:
//
//   Couldn't find all resumable slots by key/index during replaying.
//   The tree doesn't match so React will fallback to client rendering.
//
// Was dahintersteckt (nachgelesen in node_modules, nicht geraten):
//
//  1. Mit cacheComponents (siehe next.config.ts) prerendert Next für jede
//     Seite eine statische Schale und merkt sich den abgebrochenen Rest als
//     „postponed state". Kommt später ein Request, wird dieser Zustand
//     fortgesetzt statt neu gerendert („resume").
//  2. Bei einem POST auf eine Seite — und ein POST mit
//     application/x-www-form-urlencoded oder multipart/form-data gilt für
//     Next als „möglicher Server-Action-Request", auch ohne gültige Action-ID
//     (siehe server/lib/server-action-request-meta.js) — rendert Next danach
//     die Seite als HTML und setzt dabei genau diesen gespeicherten Zustand
//     fort (build/templates/app-page-runtime.js: `postponed =
//     incrementalCacheEntry.value.postponed`).
//  3. Passt der gespeicherte Baum nicht mehr zum gerade gerenderten — etwa
//     weil der Cache-Eintrag noch aus einem früheren Deploy stammt oder
//     gerade erneuert wird —, findet React beim Abspielen nicht alle Slots
//     wieder, meldet das über onError und rendert den betroffenen Teil
//     stattdessen im Browser. Die Antwort geht trotzdem raus.
//
// Der Fehler entsteht also im Zusammenspiel von Next-Cache und React-Resume,
// nicht in unserem Code: Die Schale von „/" ist statisches JSX, alles
// Laufzeit-Abhängige liegt hinter <Suspense> (siehe src/app/page.tsx und
// src/app/layout.tsx). Wir können ihn nicht beheben, nur aufhören, ihn als
// Serverfehler zu zählen — im Funktionslog von Netlify steht er weiterhin,
// Next protokolliert ihn unabhängig von uns.
//
// Bewusst eng gefasst: Erkannt wird nur der Satz, mit dem React beide
// Resume-Meldungen abschließt („Couldn't find all resumable slots …" und
// „Expected the resume to render <x> in this slot …", siehe
// react-dom/cjs/react-dom-server.edge.development.js). Alles andere landet
// weiterhin im Protokoll.
const REACT_CLIENT_FALLBACK_NOTICE =
  "The tree doesn't match so React will fallback to client rendering.";

export function isRecoverableRenderError(message: string): boolean {
  return message.includes(REACT_CLIENT_FALLBACK_NOTICE);
}
