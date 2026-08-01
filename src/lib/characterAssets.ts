// Server-seitige Asset-Uploads rund um Charaktere, die NICHT über die
// content_images-Tabelle laufen: das bei der Charakter-Anlage/Bearbeitung
// optional hochgeladene Portrait-Bild. Es landet direkt im öffentlichen
// Asset-Bucket und wird als direkte URL in characters.portrait übernommen
// (der Nutzerwunsch: "der Link wird direkt übernommen"). Bewusst kein
// content_images-Eintrag — Portraits verhalten sich damit wie die schon immer
// möglichen externen Portrait-URLs aus dem Vault-Frontmatter (freie URL, keine
// Galerie-/Proxy-Bindung). Charakterbögen (PDFs) liegen in characterSheets.ts.
import "server-only";
import crypto from "node:crypto";
import { uploadAssetObjectToR2, assetPublicUrl } from "@/lib/r2Backup";
import { assertImageAsset } from "@/lib/assetStorage";

const PORTRAIT_PREFIX = "character-portraits/";

// Lädt ein Portrait-Bild in den Asset-Bucket und liefert seine öffentliche
// URL. Wirft InvalidAssetError (aus assetStorage.ts) bei ungültigem Typ,
// leerer oder zu großer Datei — der Aufrufer (characterAction) fängt das ab
// und gibt es als Formularfehler zurück. Der Key wird aus einer UUID gebaut
// (kein vom Client stammender Dateiname), die Endung aus dem MIME-Type.
export async function uploadCharacterPortraitImage(file: {
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const extension = assertImageAsset(file.mimeType, file.buffer.byteLength);
  const key = `${PORTRAIT_PREFIX}${crypto.randomUUID()}.${extension}`;
  await uploadAssetObjectToR2(key, file.buffer, file.mimeType);
  return assetPublicUrl(key);
}
