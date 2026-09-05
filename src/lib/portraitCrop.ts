// Der gewählte Bildausschnitt eines Portraits.
//
// Der Bildkasten des Charakterbogens hat ein festes Seitenverhältnis
// (PHOTO_BOX in personnelFileLayout.ts, 195 × 217). Ein Bild, das anders
// geschnitten ist, muss beschnitten werden — bisher entschied das
// `object-fit: cover` allein, also immer die Mitte. Hier wählt die Person den
// Ausschnitt selbst.
//
// Bewusst OHNE `server-only`: die Zuschnitt-Rechnung braucht der Editor im
// Browser (Vorschau, Zeichnen auf die Leinwand) UND der Server (Prüfung beim
// Speichern).
//
// Der Zuschnitt wird beim Speichern EINGEBACKEN: der Browser zeichnet das
// Ergebnis im Seitenverhältnis des Kastens auf eine Leinwand und lädt dieses
// Bild hoch. Bogen und PDF bekommen dadurch ein Bild, das ohnehin passt, und
// brauchen keine eigene Ausschnitt-Logik — was auf dem Bildschirm steht, steht
// auch im PDF. Die Einstellung selbst wird trotzdem mitgespeichert
// (metadata.portraitCrop), damit sich der Ausschnitt später aus dem Original
// (metadata.portraitSource) neu wählen lässt, ohne die Datei erneut zu suchen.

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

export interface CropRect {
  // Der Ausschnitt im Quellbild, in dessen eigenen Pixeln.
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

// Welcher Teil des Quellbildes im Kasten landet.
//
// Zuerst der größte Ausschnitt im Seitenverhältnis des Kastens, der ins Bild
// passt (das ist `cover`), dann durch den Zoom verkleinert, dann über x/y
// verschoben — aber nie über den Bildrand hinaus, sonst stünde im Kasten ein
// Streifen Nichts.
export function cropRect(
  imageWidth: number,
  imageHeight: number,
  crop: PortraitCrop,
): CropRect {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { sx: 0, sy: 0, sWidth: 0, sHeight: 0 };
  }
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);

  // Der deckende Ausschnitt: so groß wie möglich im Verhältnis des Kastens.
  let width = imageWidth;
  let height = width / PORTRAIT_ASPECT;
  if (height > imageHeight) {
    height = imageHeight;
    width = height * PORTRAIT_ASPECT;
  }
  width /= zoom;
  height /= zoom;

  // Die Mitte des Ausschnitts liegt auf dem gewählten Punkt, bleibt aber so
  // weit vom Rand entfernt, dass der Ausschnitt vollständig im Bild liegt.
  const centerX = (clamp(crop.x, 0, 100) / 100) * imageWidth;
  const centerY = (clamp(crop.y, 0, 100) / 100) * imageHeight;
  const sx = clamp(centerX - width / 2, 0, imageWidth - width);
  const sy = clamp(centerY - height / 2, 0, imageHeight - height);

  return { sx, sy, sWidth: width, sHeight: height };
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

// Wie groß das zugeschnittene Bild gespeichert wird. Das Doppelte der
// Kastenmaße reicht für den Druck (der Bogen ist 8,5 × 11 Zoll bei 96 dpi,
// das Bild landet also mit rund 190 dpi auf dem Papier) und hält die Datei
// klein.
export const CROP_OUTPUT_WIDTH = PHOTO_BOX.width * 2;
export const CROP_OUTPUT_HEIGHT = PHOTO_BOX.height * 2;
