"use server";
import { markdownToHtml } from "@/lib/markdown";

// Rendert den Vorschau-Tab in MarkdownEditor.tsx server-seitig statt die
// komplette remark/rehype-Pipeline ins Client-Bundle zu ziehen — direkter
// Aufruf als asynchrone Funktion vom Client aus (kein useActionState/Form
// nötig dafür, gleiches Muster wie toggleBookmark/toggleSubscription in
// src/components/FollowButtons.tsx). Kein Auth-Check nötig: reines,
// zustandsloses Rendern von Text, der ohnehin schon im Browser des
// aufrufenden Users liegt — es wird nichts gespeichert oder gelesen, das
// nicht schon in seiner eigenen Textarea steht.
export async function renderMarkdownPreview(markdown: string): Promise<string> {
  return markdownToHtml(markdown);
}
