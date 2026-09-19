"use server";
import { markdownToHtml } from "@/lib/markdown";
import { resolvePublicWikilinks } from "@/lib/autolink";

// Rendert den Vorschau-Tab in MarkdownEditor.tsx server-seitig statt die
// komplette remark/rehype-Pipeline ins Client-Bundle zu ziehen — direkter
// Aufruf als asynchrone Funktion vom Client aus (kein useActionState/Form
// nötig dafür, gleiches Muster wie toggleBookmark/toggleSubscription in
// src/components/FollowButtons.tsx).
//
// Die Wikilinks werden mit aufgelöst (resolvePublicWikilinks): sonst zeigte
// die Vorschau ein von Hand getipptes [[Ziel]] als <a href="wikilink://Ziel">
// — etwas, das aussieht wie ein Link, aber nirgendwohin führt. Bewusst nur
// gegen die öffentlichen Ziele: diese Aktion braucht keine Anmeldung (siehe
// unten), darf also nicht verraten, welche Entwürfe es gibt. Was sie auflöst,
// steht ohnehin in den öffentlichen Listen (/archive, /characters,
// /chronologie).
//
// Kein Auth-Check nötig: gerendert wird ausschließlich Text, der ohnehin
// schon im Browser des aufrufenden Users liegt — gespeichert wird nichts, und
// gelesen nur, was öffentlich sichtbar ist.
export async function renderMarkdownPreview(markdown: string): Promise<string> {
  return resolvePublicWikilinks(await markdownToHtml(markdown));
}
