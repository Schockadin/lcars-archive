// Der gewählte Bildausschnitt eines Portraits.
//
// Der Bildkasten des Charakterbogens hat ein festes Seitenverhältnis
// (PHOTO_BOX in personnelFileLayout.ts, 195 × 217). Ein Bild, das anders
// geschnitten ist, muss beschnitten werden — bisher entschied das
// `object-fit: cover` allein, also immer die Mitte. Hier wählt die Person den
// Ausschnitt selbst.
//
// Bewusst OHNE `server-only`: die Zuschnitt-Rechnung braucht der Editor im
// Browser (Vorschau) UND der Server (Prüfung beim Speichern, Anzeige auf dem
// Bogen, PDF).
//
// Gespeichert wird das ORIGINAL, nicht das zugeschnittene Bild.
//
// Bis v1.29.57 buk der Browser den Ausschnitt ein: er zeichnete ihn auf eine
// Leinwand und lud dieses Bild als Portrait hoch. Damit lag in
// characters.portrait eine verlustbehaftete, klein gerechnete Kopie — das
// Original existierte nur noch als Nebeneintrag, und jedes Nachjustieren
// schrieb eine weitere Kopie in den Bucket.
//
// Jetzt ist characters.portrait das hochgeladene Original, und der Ausschnitt
// ist eine ANWEISUNG dazu (metadata.portraitCrop: Zoom + Mittelpunkt), die
// beim Anzeigen angewandt wird — am Bildschirm per CSS (previewStyle), im PDF
// über dieselbe Rechnung (pdfCropBox). Nachjustieren ändert nur noch drei
// Zahlen, und wer das Bild woanders braucht (Karten-Thumbnail, Karussell auf
// der Charakterseite), bekommt das unbeschnittene Original.
//
// Altbestand: dort steht in characters.portrait das eingebackene Bild und in
// metadata.portraitSource das Original. resolvePortraitView nimmt deshalb das
// Original, wo es eines gibt — auf dieses passt der gespeicherte Ausschnitt,
// und das Ergebnis sieht aus wie bisher.

import { PHOTO_BOX } from "@/lib/personnelFileLayout";

export const PORTRAIT_ASPECT = PHOTO_BOX.width / PHOTO_BOX.height;

// Wie weit sich ein Bild vergrößern lässt. Mehr als das Vierfache macht aus
// jedem Portrait Pixelbrei.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface PortraitCrop {
  // Vergrößerung über die Deckung des Kastens hinaus (1 = gerade eben
  // deckend, wie object-fit: cover).
  zoom: number;
  // Der Punkt des Bildes, der in der Mitte des Kastens landet — in Prozent
  // der Bildbreite bzw. -höhe. 50/50 ist die Mitte, also das, was `cover`
  // ohne weitere Angabe zeigt.
  x: number;
  y: number;
}

export const DEFAULT_CROP: PortraitCrop = { zoom: 1, x: 50, y: 50 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Einen gespeicherten Zuschnitt einlesen. Alles Unbrauchbare fällt auf die
// Vorgabe zurück — ein kaputter Wert in der Metadata darf keinen Bogen
// zerlegen.
export function parsePortraitCrop(value: unknown): PortraitCrop {
  if (!value || typeof value !== "object") return { ...DEFAULT_CROP };
  const raw = value as Record<string, unknown>;
  const num = (key: keyof PortraitCrop, fallback: number) => {
    const candidate = raw[key];
    return typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : fallback;
  };
  return {
    zoom: clamp(num("zoom", 1), MIN_ZOOM, MAX_ZOOM),
    x: clamp(num("x", 50), 0, 100),
    y: clamp(num("y", 50), 0, 100),
  };
}

export function isDefaultCrop(crop: PortraitCrop): boolean {
  return crop.zoom === 1 && crop.x === 50 && crop.y === 50;
}

// Die Vorschau im Editor zeigt dasselbe über CSS: das Bild deckt den Kasten
// (`cover`), wird um den Zoom vergrößert und am gewählten Punkt verankert.
// object-position und transform-origin tragen denselben Punkt, damit das Bild
// beim Zoomen nicht unter dem Finger wegläuft.
export function previewStyle(crop: PortraitCrop): {
  objectPosition: string;
  transform: string;
  transformOrigin: string;
} {
  const position = `${clamp(crop.x, 0, 100)}% ${clamp(crop.y, 0, 100)}%`;
  return {
    objectPosition: position,
    transform: `scale(${clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM)})`,
    transformOrigin: position,
  };
}

// Dieselbe Darstellung für das PDF. @react-pdf kennt weder transform noch
// transform-origin, aber `overflow: hidden` an einem <View> und objectFit/
// objectPosition am <Image> — damit lässt sich exakt dasselbe ausdrücken:
//
//   Der Kasten schneidet ab (overflow: hidden). Darin liegt das Bild um den
//   Zoom vergrößert und so verschoben, dass der gewählte Punkt dort bleibt,
//   wo er auch am Bildschirm liegt (das ist genau das, was
//   transform-origin an derselben Stelle bewirkt).
//
// Maße in den Einheiten des Kastens; objectPosition wird als Prozent gesetzt.
export function pdfCropBox(
  crop: PortraitCrop,
  box: { width: number; height: number },
): {
  width: number;
  height: number;
  left: number;
  top: number;
  objectPositionX: string;
  objectPositionY: string;
} {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const x = clamp(crop.x, 0, 100);
  const y = clamp(crop.y, 0, 100);
  // `+ 0` glättet die -0, die bei zoom === 1 bzw. x/y === 0 entsteht — sie ist
  // rechnerisch dasselbe, liest sich aber weder im Test noch im PDF gut.
  return {
    width: box.width * zoom,
    height: box.height * zoom,
    left: -(zoom - 1) * (x / 100) * box.width + 0,
    top: -(zoom - 1) * (y / 100) * box.height + 0,
    objectPositionX: `${x}%`,
    objectPositionY: `${y}%`,
  };
}

// Welches Bild mit welchem Ausschnitt im Bildkasten landet.
//
// Der Ausschnitt gehört zum ORIGINAL. Neue Datensätze führen es direkt in
// characters.portrait; im Altbestand steht dort das eingebackene Bild und das
// Original in metadata.portraitSource — dann gilt dieses, denn auf es passt
// der gespeicherte Ausschnitt (siehe Dateikopf).
export function resolvePortraitView(
  portrait: string | null | undefined,
  portraitSource: string | null | undefined,
  rawCrop: unknown,
): { src: string | null; crop: PortraitCrop } {
  return {
    src: portraitSource || portrait || null,
    crop: parsePortraitCrop(rawCrop),
  };
}
