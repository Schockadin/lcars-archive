// Bilder im Browser für den Upload vorbereiten.
//
// Anlass: Hochladen über den Bilder-Knopf einer Inhaltsseite blieb bei „Wird
// hochgeladen…" stehen — ohne Fehler, ohne Ergebnis. Zwei Ursachen, beide
// hier adressiert:
//
//   1. Die Bilder gingen als EIN Formular an die Server Action, mit dem
//      Original in voller Größe. Eine Server Action ist eine ganz normale
//      Anfrage an die Funktion, die die App ausliefert — und die hat auf der
//      Plattform ein hartes Größenlimit (bei Netlify/Lambda 6 MB inkl.
//      Multipart-Rahmen). Ein Handyfoto reißt das allein, mehrere erst recht.
//      Die Anfrage wird dann von der Plattform abgewiesen, bevor unser Code
//      sie überhaupt sieht: kein Fehler aus der Action, nur eine tote Anfrage.
//   2. Die Aufrufer haben den Fehlschlag nicht abgefangen (siehe
//      ContentImageGallery) — die Anzeige blieb deshalb ewig im Ladezustand.
//
// Die Vorbereitung hier verkleinert große Bilder VOR dem Upload auf ein Maß,
// das für Anzeige und Druck reicht. Das ist kein Notbehelf, sondern ohnehin
// sinnvoll: die Galerie zeigt 100 px, die Karten 76 px, der Charakterbogen
// rund 400 px.
//
// Bewusst OHNE "server-only" und ohne Import aus dem Server-Teil: der Code
// läuft im Browser (Canvas). Die Grenzwerte spiegeln die serverseitigen aus
// assetStorage.ts/contentImages.ts — ein Test hält sie deckungsgleich.

// Muss zu MAX_ASSET_IMAGE_BYTES (assetStorage.ts) und
// MAX_CONTENT_IMAGE_BYTES (contentImages.ts) passen.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Ab dieser Größe wird verkleinert. Darunter lohnt das Neucodieren nicht — es
// würde ein kleines Bild nur ein weiteres Mal durch JPEG drehen.
export const DOWNSCALE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

// Längste Kante nach dem Verkleinern. Reicht für den Charakterbogen (dessen
// Bildkasten bei doppelter Auflösung 390 × 434 groß ist) und für jede Anzeige
// in der App.
export const MAX_UPLOAD_EDGE = 2000;

const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.85;

// GIFs bleiben unangetastet: eine Leinwand behielte nur das erste Einzelbild,
// aus einer Animation würde still ein Standbild.
const SKIP_TYPES = new Set(["image/gif"]);

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Warum eine Datei gar nicht erst abgeschickt wird — null, wenn alles passt.
// Bewusst vor dem Upload geprüft: die Meldung der Server Action käme bei genau
// diesen Fällen (zu groß) oft gar nicht mehr an, weil die Plattform die
// Anfrage vorher abweist.
export function rejectionReason(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (file.size === 0) return `„${file.name}" ist leer.`;
  if (!/^image\//.test(file.type)) {
    return `„${file.name}" ist kein Bild.`;
  }
  return null;
}

// Verkleinert ein Bild, wenn es zu groß ist — sonst kommt die Datei
// unverändert zurück. Schlägt das Verkleinern fehl (Browser ohne Canvas,
// kaputte Datei), kommt ebenfalls das Original zurück: dann entscheidet der
// Server, und der meldet wenigstens einen Fehler.
export async function prepareImageForUpload(file: File): Promise<File> {
  if (SKIP_TYPES.has(file.type)) return file;
  if (file.size <= DOWNSCALE_THRESHOLD_BYTES) return file;
  try {
    return (await downscaleImage(file)) ?? file;
  } catch {
    return file;
  }
}

async function downscaleImage(file: File): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const bitmap = await loadImage(file);
  const scale = Math.min(
    1,
    MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  // Weiß hinterlegen: JPEG kennt keine Transparenz, ohne Grund würde ein
  // durchscheinendes PNG schwarz.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
  );
  if (!blob) return null;
  // Nur übernehmen, wenn es wirklich kleiner wurde.
  if (blob.size >= file.size) return null;
  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: OUTPUT_TYPE,
    lastModified: Date.now(),
  });
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Bild nicht lesbar"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function replaceExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "bild"}.${extension}`;
}

// Eine verständliche Meldung für einen Upload, der nicht durchkam. Ein
// Abbruch auf dem Transportweg (Größenlimit der Plattform, Verbindung weg)
// erreicht den Aufrufer als TypeError/„Failed to fetch" — ohne diese
// Übersetzung stünde dort nichts, was weiterhilft.
export function uploadErrorMessage(file: { name: string; size: number }): string {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `„${file.name}" ist mit ${formatMegabytes(file.size)} zu groß (max. ${formatMegabytes(MAX_UPLOAD_BYTES)}).`;
  }
  return `„${file.name}" konnte nicht hochgeladen werden. Versuch es noch einmal — bei sehr großen Bildern hilft ein kleineres.`;
}
