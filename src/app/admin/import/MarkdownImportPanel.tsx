"use client";
import { useRef, useState } from "react";
import {
  previewMarkdownImportAction,
  confirmMarkdownImportAction,
  type ImportContentType,
  type ImportPreviewResult,
  type ImportEdits,
} from "./actions";
import { FormField } from "@/app/_shared/FormPrimitives";
import { MarkdownFormatHint } from "@/app/_shared/MarkdownHint";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import PreviewConfirmFooter from "@/components/PreviewConfirmFooter";
import { ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";

const CONTENT_TYPE_LABELS: Record<ImportContentType, string> = {
  archive: "Archiv-Eintrag",
  mission: "Mission",
  character: "Charakter",
  mission_log: "Missionslog",
};

const MISSION_STATUSES = ["active", "completed", "failed", "abandoned"];
const CHARACTER_STATUSES = ["active", "retired", "deceased"];
const inputClass = "rounded-lcars-pill lcars-input w-full";

type RowStatus = "ready" | "importing" | "imported" | "discarded" | "error";

interface Row {
  filename: string;
  content: string;
  preview: ImportPreviewResult;
  status: RowStatus;
  resultSlug?: string;
  resultError?: string;
}

interface MissionOption {
  slug: string;
  title: string;
}
interface CharacterOption {
  slug: string;
  name: string;
  playerName: string;
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Baut aus dem aktuellen Formularinhalt einer Zeile das *Edits-Objekt für
// confirmMarkdownImportAction — siehe markdownImport.ts, wo diese Felder
// gegenüber dem ursprünglich geparsten Frontmatter gewinnen. Serverseitig
// wird alles erneut validiert (leerer Titel, ungültiger Slug, unbekannte
// Mission/Autor, ...), ein clientseitig unvollständig ausgefülltes Feld
// führt also höchstens zu einer Fehlermeldung an dieser einen Zeile, nie zu
// einem fehlerhaften DB-Eintrag.
function buildEdits(kind: string, fd: FormData): ImportEdits {
  const tags = splitTags(String(fd.get("tags") ?? ""));
  const bodyMarkdown = String(fd.get("bodyMarkdown") ?? "");

  if (kind === "archive") {
    return {
      slug: String(fd.get("slug") ?? ""),
      title: String(fd.get("title") ?? ""),
      tags,
      summary: String(fd.get("summary") ?? "").trim() || null,
      bodyMarkdown,
    };
  }
  if (kind === "mission") {
    return {
      slug: String(fd.get("slug") ?? ""),
      title: String(fd.get("title") ?? ""),
      status: String(fd.get("status") ?? "active"),
      startedAt: String(fd.get("startedAt") ?? "").trim() || null,
      endedAt: String(fd.get("endedAt") ?? "").trim() || null,
      tags,
      bodyMarkdown,
    };
  }
  if (kind === "character") {
    return {
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      status: String(fd.get("status") ?? "active"),
      bodyMarkdown,
    };
  }
  // mission_log
  const sessionNrRaw = String(fd.get("sessionNr") ?? "").trim();
  return {
    title: String(fd.get("title") ?? ""),
    missionSlug: String(fd.get("missionSlug") ?? ""),
    authorSlug: String(fd.get("authorSlug") ?? ""),
    logDate: String(fd.get("logDate") ?? "").trim() || null,
    sessionNr: sessionNrRaw ? Number(sessionNrRaw) : NaN,
    tags,
    bodyMarkdown,
    ownerSlug: String(fd.get("ownerSlug") ?? "").trim() || null,
  };
}

// Admin-only (siehe page.tsx) — Upload einzelner oder mehrerer .md-Dateien im
// selben Frontmatter-Format wie das CLI-Ingest (scripts/ingest/*.ts). Jede
// Datei wird zuerst nur geparst (previewMarkdownImportAction, kein
// DB-Schreibzugriff), dann einzeln durchblätterbar als editierbares
// Formular angezeigt (Datei X von N) und muss einzeln bestätigt werden
// (confirmMarkdownImportAction) — kein Batch-"alle übernehmen". Alle
// Formulare bleiben gleichzeitig gemountet (nur per CSS ausgeblendet), damit
// Änderungen beim Vor-/Zurückblättern nicht verloren gehen — gleiches
// Prinzip wie MarkdownEditor.tsx beim Rohtext/Vorschau-Umschalten.
export default function MarkdownImportPanel({
  missions,
  characters,
}: {
  missions: MissionOption[];
  characters: CharacterOption[];
}) {
  const [contentType, setContentType] = useState<ImportContentType>("archive");
  const [rows, setRows] = useState<Row[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRefs = useRef<Record<string, HTMLFormElement | null>>({});

  async function handleFiles(files: FileList) {
    setLoadError(null);
    setLoadingPreview(true);
    try {
      const entries = await Promise.all(
        Array.from(files).map(async (file) => ({
          filename: file.name,
          content: await file.text(),
        })),
      );
      const previews = await previewMarkdownImportAction(contentType, entries);
      setRows(
        entries.map((entry, i) => ({
          filename: entry.filename,
          content: entry.content,
          preview: previews[i],
          status: "ready" as const,
        })),
      );
      setCurrentIndex(0);
    } catch {
      setLoadError("Dateien konnten nicht gelesen/geparst werden.");
    } finally {
      setLoadingPreview(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Springt nach einer abgeschlossenen Zeile automatisch zur nächsten noch
  // offenen — bleibt sonst auf der aktuellen Zeile stehen, damit das
  // Ergebnis (Fehler/Erfolg) sichtbar bleibt.
  function advanceToNextReady(afterIndex: number, updated: Row[]) {
    const next = updated.findIndex((r, i) => i > afterIndex && r.status === "ready");
    if (next !== -1) setCurrentIndex(next);
  }

  async function handleConfirm(index: number) {
    const row = rows[index];
    if (!row || !row.preview.ok) return;
    const formEl = formRefs.current[row.filename];
    if (!formEl) return;
    const edits = buildEdits(row.preview.kind, new FormData(formEl));

    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, status: "importing" } : r)),
    );
    const result = await confirmMarkdownImportAction(
      contentType,
      row.filename,
      row.content,
      edits,
    );
    setRows((prev) => {
      const updated = prev.map((r, i) =>
        i === index
          ? result.ok
            ? { ...r, status: "imported" as const, resultSlug: result.slug }
            : { ...r, status: "error" as const, resultError: result.error }
          : r,
      );
      advanceToNextReady(index, updated);
      return updated;
    });
  }

  function handleDiscard(index: number) {
    setRows((prev) => {
      const updated = prev.map((r, i) =>
        i === index ? { ...r, status: "discarded" as const } : r,
      );
      advanceToNextReady(index, updated);
      return updated;
    });
  }

  return (
    <div className="lcars-text flex flex-col gap-[16px]">
      <p className="text-lcars-text-dim text-[13px]">
        Lädt eine oder mehrere Markdown-Dateien im Vault-Frontmatter-Format
        (wie beim CLI-Ingest) hoch. Jede Datei wird zunächst nur geparst und
        als durchblätterbare, editierbare Vorschau angezeigt — erst nach
        individueller Bestätigung wird tatsächlich ein neuer Eintrag angelegt.
        Bereits vergebene Slugs werden abgelehnt, es wird nichts
        überschrieben. Querverweise (related_*, Teilnehmer, Dialog-Schauplatz)
        werden nur gegen bereits vorhandene Einträge aufgelöst — referenzierte
        Dateien vorher hochladen und bestätigen, falls nötig.
      </p>

      <div className="flex flex-wrap items-center gap-[12px]">
        <select
          value={contentType}
          onChange={(e) => {
            setContentType(e.target.value as ImportContentType);
            setRows([]);
            setCurrentIndex(0);
          }}
          className="rounded-lcars-pill border border-lcars-border bg-lcars-surface px-[16px] py-[8px] text-lcars-text-contrast outline-none focus:border-lcars-amber"
        >
          {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="lcars-pill-btn--outline self-start cursor-pointer disabled:opacity-50">
          {loadingPreview ? "Wird geladen…" : "Dateien auswählen"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            disabled={loadingPreview}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleFiles(files);
            }}
          />
        </label>
      </div>

      {loadError && (
        <p className="text-lcars-red" role="alert">
          {loadError}
        </p>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center justify-between gap-[12px]">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="lcars-icon-btn size-[36px] disabled:opacity-30"
              aria-label="Vorherige Datei"
              title="Vorherige Datei"
            >
              <ChevronLeftIcon />
            </button>
            <p className="lcars-eyebrow text-center">
              Datei {currentIndex + 1} von {rows.length} — {rows[currentIndex].filename}
            </p>
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(rows.length - 1, i + 1))}
              disabled={currentIndex === rows.length - 1}
              className="lcars-icon-btn size-[36px] disabled:opacity-30"
              aria-label="Nächste Datei"
              title="Nächste Datei"
            >
              <ChevronRightIcon />
            </button>
          </div>

          {rows.map((row, index) => (
            <div key={row.filename} className={index === currentIndex ? "" : "hidden"}>
              <ImportRowCard
                row={row}
                index={index}
                missions={missions}
                characters={characters}
                formRef={(el) => {
                  formRefs.current[row.filename] = el;
                }}
                onConfirm={() => handleConfirm(index)}
                onDiscard={() => handleDiscard(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportRowCard({
  row,
  index,
  missions,
  characters,
  formRef,
  onConfirm,
  onDiscard,
}: {
  row: Row;
  index: number;
  missions: MissionOption[];
  characters: CharacterOption[];
  formRef: (el: HTMLFormElement | null) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const { preview } = row;

  return (
    <div className="rounded-lcars border border-lcars-border p-[16px] flex flex-col gap-[8px]">
      {!preview.ok ? (
        <p className="text-lcars-red">{preview.error}</p>
      ) : (
        <>
          {preview.warnings.length > 0 && (
            <ul className="text-lcars-amber text-[13px] list-disc pl-[20px]">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {row.status === "ready" && (
            <form
              ref={formRef}
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-[4px]"
            >
              <ImportEditFields
                idPrefix={`import-${index}`}
                preview={preview}
                missions={missions}
                characters={characters}
              />
            </form>
          )}

          {row.status !== "ready" && (
            <div
              className="mission-body lcars-text text-[14px] max-h-[200px] overflow-y-auto rounded-lcars border border-lcars-border p-[10px]"
              dangerouslySetInnerHTML={{
                __html:
                  preview.kind === "archive"
                    ? preview.contentHtml
                    : preview.kind === "mission" || preview.kind === "mission_log"
                      ? preview.bodyHtml
                      : preview.bio,
              }}
            />
          )}
        </>
      )}

      {row.status === "ready" && preview.ok && (
        <PreviewConfirmFooter
          onCancel={onDiscard}
          onConfirm={onConfirm}
          pending={false}
          canConfirm={true}
          className="flex gap-[12px] items-center justify-end mt-[4px]"
        />
      )}
      {row.status === "importing" && <p className="text-lcars-text-dim">Wird angelegt…</p>}
      {row.status === "imported" && (
        <p className="text-lcars-amber">Angelegt als „{row.resultSlug}“.</p>
      )}
      {row.status === "error" && <p className="text-lcars-red">{row.resultError}</p>}
      {row.status === "discarded" && (
        <p className="text-lcars-text-dim">Verworfen, nicht angelegt.</p>
      )}
    </div>
  );
}

function ImportEditFields({
  idPrefix,
  preview,
  missions,
  characters,
}: {
  idPrefix: string;
  preview: Exclude<ImportPreviewResult, { ok: false }>;
  missions: MissionOption[];
  characters: CharacterOption[];
}) {
  if (preview.kind === "archive") {
    return (
      <>
        <FormField label="Titel" htmlFor={`${idPrefix}-title`}>
          <input id={`${idPrefix}-title`} name="title" defaultValue={preview.title} className={inputClass} />
        </FormField>
        <FormField
          label="Slug"
          htmlFor={`${idPrefix}-slug`}
          hint={preview.slugTaken ? "Bereits vergeben — bitte anpassen." : undefined}
        >
          <input id={`${idPrefix}-slug`} name="slug" defaultValue={preview.slug} className={inputClass} />
        </FormField>
        <FormField label="Kategorie" htmlFor={`${idPrefix}-category`}>
          <input
            id={`${idPrefix}-category`}
            defaultValue={preview.category}
            disabled
            className={`${inputClass} opacity-60`}
          />
        </FormField>
        <FormField label="Tags (kommagetrennt)" htmlFor={`${idPrefix}-tags`}>
          <input
            id={`${idPrefix}-tags`}
            name="tags"
            defaultValue={preview.tags.join(", ")}
            className={inputClass}
          />
        </FormField>
        <FormField label="Zusammenfassung" htmlFor={`${idPrefix}-summary`}>
          <textarea
            id={`${idPrefix}-summary`}
            name="summary"
            defaultValue={preview.summary ?? ""}
            className={`${inputClass} min-h-[60px] resize-y`}
          />
        </FormField>
        <FormField label="Text" htmlFor={`${idPrefix}-body`} hint={<MarkdownFormatHint />}>
          <MarkdownEditor id={`${idPrefix}-body`} defaultValue={preview.bodyMarkdown} />
        </FormField>
      </>
    );
  }

  if (preview.kind === "mission") {
    return (
      <>
        <FormField label="Titel" htmlFor={`${idPrefix}-title`}>
          <input id={`${idPrefix}-title`} name="title" defaultValue={preview.title} className={inputClass} />
        </FormField>
        <FormField
          label="Slug"
          htmlFor={`${idPrefix}-slug`}
          hint={preview.slugTaken ? "Bereits vergeben — bitte anpassen." : undefined}
        >
          <input id={`${idPrefix}-slug`} name="slug" defaultValue={preview.slug} className={inputClass} />
        </FormField>
        <FormField label="Status" htmlFor={`${idPrefix}-status`}>
          <select id={`${idPrefix}-status`} name="status" defaultValue={preview.status} className={inputClass}>
            {MISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Start" htmlFor={`${idPrefix}-started`}>
          <input
            id={`${idPrefix}-started`}
            name="startedAt"
            type="date"
            defaultValue={preview.startedAt ?? ""}
            className={inputClass}
          />
        </FormField>
        <FormField label="Ende" htmlFor={`${idPrefix}-ended`}>
          <input
            id={`${idPrefix}-ended`}
            name="endedAt"
            type="date"
            defaultValue={preview.endedAt ?? ""}
            className={inputClass}
          />
        </FormField>
        <FormField label="Tags (kommagetrennt)" htmlFor={`${idPrefix}-tags`}>
          <input
            id={`${idPrefix}-tags`}
            name="tags"
            defaultValue={preview.tags.join(", ")}
            className={inputClass}
          />
        </FormField>
        <FormField label="Text" htmlFor={`${idPrefix}-body`} hint={<MarkdownFormatHint />}>
          <MarkdownEditor id={`${idPrefix}-body`} defaultValue={preview.bodyMarkdown} />
        </FormField>
      </>
    );
  }

  if (preview.kind === "character") {
    return (
      <>
        <FormField label="Name" htmlFor={`${idPrefix}-name`}>
          <input id={`${idPrefix}-name`} name="name" defaultValue={preview.name} className={inputClass} />
        </FormField>
        <FormField
          label="Slug"
          htmlFor={`${idPrefix}-slug`}
          hint={preview.slugTaken ? "Bereits vergeben — bitte anpassen." : undefined}
        >
          <input id={`${idPrefix}-slug`} name="slug" defaultValue={preview.slug} className={inputClass} />
        </FormField>
        <FormField label="Status" htmlFor={`${idPrefix}-status`}>
          <select id={`${idPrefix}-status`} name="status" defaultValue={preview.status} className={inputClass}>
            {CHARACTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Biografie" htmlFor={`${idPrefix}-body`} hint={<MarkdownFormatHint />}>
          <MarkdownEditor id={`${idPrefix}-body`} defaultValue={preview.bodyMarkdown} />
        </FormField>
      </>
    );
  }

  // mission_log
  return (
    <>
      <FormField label="Titel" htmlFor={`${idPrefix}-title`}>
        <input id={`${idPrefix}-title`} name="title" defaultValue={preview.title} className={inputClass} />
      </FormField>
      <FormField label="Mission" htmlFor={`${idPrefix}-mission`}>
        <select
          id={`${idPrefix}-mission`}
          name="missionSlug"
          defaultValue={preview.missionTitle ? preview.missionSlug : ""}
          className={inputClass}
        >
          <option value="" disabled>
            — auswählen —
          </option>
          {missions.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Autor" htmlFor={`${idPrefix}-author`}>
        <select
          id={`${idPrefix}-author`}
          name="authorSlug"
          defaultValue={preview.authorName ? preview.authorSlug : ""}
          className={inputClass}
        >
          <option value="" disabled>
            — auswählen —
          </option>
          {characters.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c.playerName})
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Sitzungsnummer" htmlFor={`${idPrefix}-session`}>
        <input
          id={`${idPrefix}-session`}
          name="sessionNr"
          type="number"
          min={1}
          defaultValue={preview.sessionNr ?? ""}
          className={inputClass}
        />
      </FormField>
      <FormField label="Datum" htmlFor={`${idPrefix}-date`}>
        <input
          id={`${idPrefix}-date`}
          name="logDate"
          type="date"
          defaultValue={preview.logDate ?? ""}
          className={inputClass}
        />
      </FormField>
      <FormField label="Tags (kommagetrennt)" htmlFor={`${idPrefix}-tags`}>
        <input
          id={`${idPrefix}-tags`}
          name="tags"
          defaultValue={preview.tags.join(", ")}
          className={inputClass}
        />
      </FormField>
      <FormField label="Text" htmlFor={`${idPrefix}-body`} hint={<MarkdownFormatHint />}>
        <MarkdownEditor id={`${idPrefix}-body`} defaultValue={preview.bodyMarkdown} />
      </FormField>
    </>
  );
}
