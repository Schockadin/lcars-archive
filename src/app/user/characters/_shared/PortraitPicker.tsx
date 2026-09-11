"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { XIcon } from "@/lib/icons";
import {
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  isDefaultCrop,
  previewStyle,
  type PortraitCrop,
} from "@/lib/portraitCrop";
import { prepareImageForUpload, rejectionReason } from "@/lib/imageUpload";

// Portrait wählen UND zuschneiden.
//
// Der Bildkasten des Bogens ist hochkant (195 × 217). Ein Bild in einem
// anderen Format wurde bisher stumm mittig beschnitten — hier wählt die Person
// den Ausschnitt selbst: ziehen zum Verschieben, Regler zum Vergrößern, in
// einer Vorschau, die den Kasten samt seiner Fase zeigt.
//
// Hochgeladen wird das ORIGINAL; der Ausschnitt fährt als Anweisung mit
// (Zoom + Mittelpunkt, JSON im Feld portraitCrop) und wird erst beim Anzeigen
// angewandt — am Bildschirm per CSS, im PDF über dieselbe Rechnung (siehe
// src/lib/portraitCrop.ts). Bis v1.29.57 buk der Browser den Ausschnitt hier
// auf eine Leinwand und lud das Ergebnis hoch; das Original blieb nur als
// Nebeneintrag zurück, und jedes Nachjustieren erzeugte eine weitere
// verlustbehaftete Kopie.
//
// Nebeneffekt, der einen eigenen Satz wert ist: ohne Leinwand gibt es auch
// das CORS-Problem nicht mehr — ein Bild von einem fremden Server ließ sich
// vorher gar nicht zuschneiden („verunreinigte" Leinwand).

export default function PortraitPicker({
  idPrefix,
  defaultUrl = "",
  defaultSource = "",
  defaultCrop = DEFAULT_CROP,
}: {
  idPrefix: string;
  // Das gespeicherte Portrait. Bei neuen Datensätzen ist das bereits das
  // Original; im Altbestand das eingebackene Bild.
  defaultUrl?: string;
  // Das Original aus dem Altbestand (metadata.portraitSource) — dort ist es
  // die Grundlage fürs Nachjustieren.
  defaultSource?: string;
  defaultCrop?: PortraitCrop;
}) {
  // Die Quelle, an der der Editor arbeitet — und die zugleich angezeigt wird:
  // entweder die gerade gewählte Datei (als Objekt-URL) oder das gespeicherte
  // Original (im Altbestand metadata.portraitSource, sonst das Portrait
  // selbst).
  const [sourceUrl, setSourceUrl] = useState<string | null>(
    defaultSource || defaultUrl || null,
  );
  const [crop, setCrop] = useState<PortraitCrop>(defaultCrop);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Der Stand beim Öffnen des Fensters. „Abbrechen" stellt ihn wieder her —
  // seit der Ausschnitt selbst das Ergebnis ist (und nicht mehr ein daraus
  // gezeichnetes Bild), wirkt jede Bewegung im Fenster sofort.
  const cropBeforeEdit = useRef<PortraitCrop>(defaultCrop);

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

  // Die gewählte Datei wird — wie in der Bilder-Galerie — vor dem Abschicken
  // verkleinert, falls sie sehr groß ist (siehe src/lib/imageUpload.ts): ein
  // Handyfoto reißt sonst das Größenlimit der Plattform, und der Upload
  // scheitert stumm. Das Ergebnis landet über ein DataTransfer wieder im
  // Dateifeld, damit das Formular ganz normal genau diese Datei abschickt.
  async function pickFile(input: HTMLInputElement) {
    const file = input.files?.[0] ?? null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setError(null);
    setCrop(DEFAULT_CROP);
    if (!file) {
      setSourceUrl(defaultSource || defaultUrl || null);
      return;
    }

    const reason = rejectionReason(file);
    if (reason) {
      setError(reason);
      input.value = "";
      setSourceUrl(defaultSource || defaultUrl || null);
      return;
    }

    const prepared = await prepareImageForUpload(file);
    if (prepared !== file && typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer();
      transfer.items.add(prepared);
      input.files = transfer.files;
    }

    const url = URL.createObjectURL(prepared);
    objectUrlRef.current = url;
    setSourceUrl(url);
  }

  // Gezeigt wird immer das Original — mit dem Ausschnitt als Anweisung
  // darüber, genau wie später auf dem Bogen.
  const previewSrc = sourceUrl || defaultUrl || "";

  return (
    <>
      <div className="stat-editor-field content-editor-head-full">
        <span className="stat-field-label">
          <span className="stat-label-secondary">Portrait</span>
        </span>

        <div className="portrait-picker">
          {previewSrc ? (
            // Der Daumen zeigt, was auf dem Bogen stehen wird: das Original
            // im Kasten, mit dem gewählten Ausschnitt darüber.
            <span className="portrait-picker-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="portrait-picker-img"
                src={previewSrc}
                alt="Aktuelles Portrait"
                style={previewStyle(crop)}
              />
            </span>
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
                onChange={(e) => {
                  void pickFile(e.currentTarget);
                }}
              />
            </label>

            <div className="flex flex-wrap items-center gap-[8px]">
              <button
                type="button"
                className="lcars-pill-btn--outline disabled:opacity-40"
                disabled={!sourceUrl}
                onClick={() => {
                  setError(null);
                  cropBeforeEdit.current = crop;
                  setOpen(true);
                }}
              >
                Ausschnitt wählen
              </button>
              {!isDefaultCrop(crop) && (
                <button
                  type="button"
                  className="lcars-link-text text-[12px]"
                  onClick={() => setCrop(DEFAULT_CROP)}
                >
                  Zuschnitt verwerfen
                </button>
              )}
              <span className="text-lcars-ink-dim text-[12px]">
                {isDefaultCrop(crop)
                  ? "JPEG/PNG/WebP/GIF bis 5 MB. Ohne eigenen Ausschnitt zeigt der Bogen die Bildmitte; gespeichert wird immer das Original."
                  : `Ausschnitt gewählt (${crop.zoom.toFixed(1)}×) — er wird beim Speichern übernommen. Das Bild selbst bleibt unbeschnitten.`}
              </span>
            </div>

            {error && (
              <p className="text-lcars-primary-ink text-[12px]">{error}</p>
            )}
          </div>
        </div>

        {/* Was das Formular sieht: die Bilddatei oben (unverändert, nur ggf.
            verkleinert) und hier der Ausschnitt als Anweisung. Eine Bild-
            ADRESSE steht bewusst NICHT dabei — der Server nimmt den bisherigen
            Stand aus der Datenbank (siehe characterHead.ts), damit eine
            Adresse gar nicht erst aus einem Formular kommen kann. */}
        <input
          type="hidden"
          name="portraitCrop"
          value={JSON.stringify(crop)}
        />
      </div>

      {open && previewSrc && (
        <CropOverlay
          src={previewSrc}
          crop={crop}
          onChange={setCrop}
          onCancel={() => {
            setCrop(cropBeforeEdit.current);
            setOpen(false);
          }}
          onApply={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Das Fenster, in dem der Ausschnitt gewählt wird. Es zeichnet nichts mehr —
// es stellt nur noch die drei Zahlen ein (Zoom, x, y), die das Formular
// mitschickt.
function CropOverlay({
  src,
  crop,
  onChange,
  onApply,
  onCancel,
}: {
  src: string;
  crop: PortraitCrop;
  onChange: (crop: PortraitCrop) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const close = useCallback(() => onCancel(), [onCancel]);
  useOverlayDismiss(close);
  const boxRef = useRef<HTMLDivElement | null>(null);
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
            className="portrait-crop-image"
            src={src}
            alt=""
            draggable={false}
            // Kein crossOrigin mehr: gelesen wird das Bild nicht (keine
            // Leinwand), und die Angabe ließ ein Bild ohne CORS-Freigabe erst
            // gar nicht laden.
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
          <button type="button" className="lcars-pill-btn" onClick={onApply}>
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
