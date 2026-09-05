"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { XIcon } from "@/lib/icons";
import {
  CROP_OUTPUT_HEIGHT,
  CROP_OUTPUT_WIDTH,
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  cropRect,
  previewStyle,
  type PortraitCrop,
} from "@/lib/portraitCrop";

// Portrait wählen UND zuschneiden.
//
// Der Bildkasten des Bogens ist hochkant (195 × 217). Ein Bild in einem
// anderen Format wurde bisher stumm mittig beschnitten — hier wählt die Person
// den Ausschnitt selbst: ziehen zum Verschieben, Regler zum Vergrößern, in
// einer Vorschau, die den Kasten samt seiner Fase zeigt.
//
// Der Zuschnitt wird beim Abschicken EINGEBACKEN: der Browser zeichnet das
// Ergebnis auf eine Leinwand und schickt es als Bild mit. Bogen und PDF
// bekommen dadurch ein Bild, das ohnehin passt — sie brauchen keine eigene
// Ausschnitt-Logik, und was am Bildschirm steht, steht auch im PDF. Die
// Einstellung selbst fährt als JSON mit, damit sich der Ausschnitt später aus
// demselben Original neu wählen lässt.

const OUTPUT_TYPE = "image/jpeg";
// Genug für den Druck, ohne die Datei aufzublähen. Der Wert ist bewusst hoch:
// ein Portrait wird einmal gewählt und dann oft gedruckt.
const OUTPUT_QUALITY = 0.92;

export default function PortraitPicker({
  idPrefix,
  defaultUrl = "",
  defaultSource = "",
  defaultCrop = DEFAULT_CROP,
}: {
  idPrefix: string;
  // Das aktuell gespeicherte (bereits zugeschnittene) Portrait.
  defaultUrl?: string;
  // Das Original, aus dem es geschnitten wurde — Grundlage fürs Nachjustieren.
  defaultSource?: string;
  defaultCrop?: PortraitCrop;
}) {
  // Die Quelle, an der der Editor arbeitet: entweder die gerade gewählte Datei
  // (als Objekt-URL) oder das gespeicherte Original.
  const [sourceUrl, setSourceUrl] = useState<string | null>(
    defaultSource || defaultUrl || null,
  );
  // Ob gerade eine Datei gewählt ist. Nur für die Vorschau: dann zeigt der
  // Daumen die neue Datei, sonst das gespeicherte Portrait.
  const [hasPickedFile, setHasPickedFile] = useState(false);
  const [crop, setCrop] = useState<PortraitCrop>(defaultCrop);
  const [open, setOpen] = useState(false);
  // Das Ergebnis: Data-URL des zugeschnittenen Bildes, geht als verstecktes
  // Feld mit dem Formular ab.
  const [cropped, setCropped] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Die Objekt-URL der gewählten Datei muss wieder freigegeben werden, sonst
  // hält die Seite die Datei im Speicher. Sie entsteht im Änderungs-Handler
  // (nicht in einem Effekt), deshalb hier nur das Aufräumen.
  const objectUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  function pickFile(file: File | null) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setError(null);
    setCropped("");
    setCrop(DEFAULT_CROP);
    setHasPickedFile(Boolean(file));
    if (!file) {
      setSourceUrl(defaultSource || defaultUrl || null);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSourceUrl(url);
  }

  // Reihenfolge der Vorschau: der frische Zuschnitt, sonst die eben gewählte
  // Datei, sonst das gespeicherte Portrait. Ohne den mittleren Fall zeigte der
  // Daumen nach dem Auswählen weiter das alte Bild.
  const previewSrc =
    cropped || (hasPickedFile ? sourceUrl : defaultUrl) || sourceUrl || "";

  return (
    <>
      <div className="stat-editor-field content-editor-head-full">
        <span className="stat-field-label">
          <span className="stat-label-secondary">Portrait</span>
        </span>

        <div className="portrait-picker">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="portrait-picker-thumb"
              src={previewSrc}
              alt="Aktuelles Portrait"
            />
          ) : (
            <span className="portrait-picker-thumb portrait-picker-thumb--empty" />
          )}

          <div className="portrait-picker-controls">
            <label className="flex flex-col gap-[4px]">
              <span className="lcars-eyebrow">Bilddatei</span>
              <input
                id={`${idPrefix}-portraitFile`}
                name="portraitFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="lcars-input lcars-file-input rounded-full w-full"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex flex-wrap items-center gap-[8px]">
              <button
                type="button"
                className="lcars-pill-btn--outline disabled:opacity-40"
                disabled={!sourceUrl}
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                Ausschnitt wählen
              </button>
              {cropped && (
                <button
                  type="button"
                  className="lcars-link-text text-[12px]"
                  onClick={() => {
                    setCropped("");
                    setCrop(DEFAULT_CROP);
                  }}
                >
                  Zuschnitt verwerfen
                </button>
              )}
              <span className="text-lcars-ink-dim text-[12px]">
                {cropped
                  ? "Zugeschnitten — wird beim Speichern übernommen."
                  : "JPEG/PNG/WebP/GIF bis 5 MB. Ohne eigenen Ausschnitt zeigt der Bogen die Bildmitte."}
              </span>
            </div>

            {error && (
              <p className="text-lcars-primary-ink text-[12px]">{error}</p>
            )}
          </div>
        </div>

        {/* Was das Formular sieht: das fertige Bild und die Einstellung, aus
            der es entstanden ist. Adresse und Original stehen bewusst NICHT
            dabei — der Server nimmt den bisherigen Stand aus der Datenbank
            (siehe characterHead.ts), damit eine Adresse gar nicht erst aus
            einem Formular kommen kann. */}
        <input type="hidden" name="portraitCropped" value={cropped} />
        <input
          type="hidden"
          name="portraitCrop"
          value={cropped ? JSON.stringify(crop) : ""}
        />
      </div>

      {open && sourceUrl && (
        <CropOverlay
          src={sourceUrl}
          crop={crop}
          onChange={setCrop}
          onCancel={() => setOpen(false)}
          onApply={(dataUrl) => {
            setCropped(dataUrl);
            setOpen(false);
          }}
          onError={(message) => {
            setError(message);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function CropOverlay({
  src,
  crop,
  onChange,
  onApply,
  onCancel,
  onError,
}: {
  src: string;
  crop: PortraitCrop;
  onChange: (crop: PortraitCrop) => void;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const close = useCallback(() => onCancel(), [onCancel]);
  useOverlayDismiss(close);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; crop: PortraitCrop } | null>(
    null,
  );

  // Ziehen verschiebt den Bildpunkt unter dem Zeiger. Die Umrechnung von
  // Pixeln in Prozent hängt am Zoom: je stärker vergrößert, desto weniger
  // Prozent bewegt derselbe Weg.
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, crop };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    const box = boxRef.current;
    if (!start || !box) return;
    const rect = box.getBoundingClientRect();
    const dx = ((event.clientX - start.x) / rect.width / start.crop.zoom) * 100;
    const dy = ((event.clientY - start.y) / rect.height / start.crop.zoom) * 100;
    onChange({
      ...start.crop,
      // Nach rechts ziehen heißt: den Bildausschnitt nach links schieben.
      x: Math.min(100, Math.max(0, start.crop.x - dx)),
      y: Math.min(100, Math.max(0, start.crop.y - dy)),
    });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const apply = () => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth) {
      onError("Das Bild konnte nicht geladen werden.");
      return;
    }
    const rect = cropRect(image.naturalWidth, image.naturalHeight, crop);
    const canvas = document.createElement("canvas");
    canvas.width = CROP_OUTPUT_WIDTH;
    canvas.height = CROP_OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) {
      onError("Der Browser kann das Bild nicht zuschneiden.");
      return;
    }
    context.drawImage(
      image,
      rect.sx,
      rect.sy,
      rect.sWidth,
      rect.sHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    try {
      onApply(canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY));
    } catch {
      // Ein Bild von einem fremden Server ohne CORS-Freigabe „verunreinigt"
      // die Leinwand; auslesen lässt sie sich dann nicht mehr.
      onError(
        "Dieses Bild liegt auf einem fremden Server und lässt sich hier nicht zuschneiden. Lade es als Datei hoch, dann geht es.",
      );
    }
  };

  return createPortal(
    <div
      className="portrait-crop-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Bildausschnitt wählen"
    >
      <div className="portrait-crop-dialog">
        <div className="flex items-center justify-between gap-[12px]">
          <h2 className="lcars-eyebrow">Bildausschnitt wählen</h2>
          <button
            type="button"
            className="lcars-icon-btn"
            onClick={onCancel}
            aria-label="Abbrechen"
            title="Abbrechen"
          >
            <XIcon />
          </button>
        </div>

        <p className="text-lcars-ink-dim text-[12px]">
          Ziehen verschiebt das Bild, der Regler vergrößert. Der Rahmen zeigt
          den Bildkasten des Bogens — samt der Schräge oben links.
        </p>

        <div
          ref={boxRef}
          className="portrait-crop-box"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            className="portrait-crop-image"
            src={src}
            alt=""
            draggable={false}
            // Für ein Bild aus dem eigenen Asset-Bucket reicht das, um die
            // Leinwand sauber zu halten; fehlt die Freigabe, greift die
            // Meldung in apply().
            crossOrigin="anonymous"
            style={previewStyle(crop)}
          />
        </div>

        <label className="flex flex-col gap-[4px]">
          {/* Bewusst kein .lcars-eyebrow: das ist kein Beiwerk, sondern der
              abgelesene Wert des Reglers — und Eyebrows verschwinden auf
              sehr schmalen Schirmen (≤ 375px). */}
          <span className="portrait-crop-zoom">
            Vergrößerung · {crop.zoom.toFixed(1)}×
          </span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={crop.zoom}
            onChange={(e) =>
              onChange({ ...crop, zoom: Number(e.target.value) })
            }
          />
        </label>

        <div className="flex flex-wrap gap-[8px]">
          <button type="button" className="lcars-pill-btn" onClick={apply}>
            Übernehmen
          </button>
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={() => onChange(DEFAULT_CROP)}
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            className="lcars-pill-btn--outline"
            onClick={onCancel}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
