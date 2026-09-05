"use client";
import { useActionState, useMemo, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import MarkdownEditor from "@/app/_shared/MarkdownEditor";
import {
  FOCUS_DISCIPLINES,
  FOCUS_DISCIPLINE_LABELS,
  focusDisciplineLabel,
  type Focus,
} from "@/lib/focusCatalog";
import {
  createFocusAction,
  updateFocusAction,
  deleteFocusAction,
  type FocusFormState,
} from "./actions";

const initialState: FocusFormState = {};

// Gemeinsame Felder von Anlegen und Bearbeiten — sonst wären beide Formulare
// bis auf die Action wortgleich. Aufgebaut wie TalentEditor.tsx; ein
// Schwerpunkt hat aber kein Voraussetzungsfeld und seine Beschreibung ist
// optional (der Regeltext führt Schwerpunkte nur als Liste).
function FocusFields({ idPrefix, focus }: { idPrefix: string; focus?: Focus }) {
  return (
    <>
      <div className="flex flex-wrap gap-[8px]">
        <label className="flex flex-col gap-[4px] flex-1 min-w-[200px]">
          <span className="lcars-eyebrow">Name</span>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            required
            defaultValue={focus?.name ?? ""}
            className="lcars-input rounded-full w-full"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Disziplin</span>
          <select
            id={`${idPrefix}-discipline`}
            name="discipline"
            defaultValue={focus?.discipline ?? "command"}
            className="lcars-input rounded-full"
          >
            {FOCUS_DISCIPLINES.map((discipline) => (
              <option key={discipline} value={discipline}>
                {FOCUS_DISCIPLINE_LABELS[discipline].label} (
                {FOCUS_DISCIPLINE_LABELS[discipline].original})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-[4px]">
        <label htmlFor={`${idPrefix}-description`} className="lcars-eyebrow">
          Erläuterung (optional)
        </label>
        {/* Markdown wie in den übrigen Textfeldern; die Erläuterung wird in
            der Auswahlliste gerendert. */}
        <MarkdownEditor
          id={`${idPrefix}-description`}
          name="description"
          rows={10}
          defaultValue={focus?.description ?? ""}
        />
      </div>
    </>
  );
}

function NewFocusForm() {
  const [state, formAction, pending] = useActionState(
    createFocusAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-[8px]">
      <button
        type="button"
        className="lcars-pill-btn--outline self-start"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Abbrechen" : "Neuer Schwerpunkt"}
      </button>

      {open && (
        // key auf dem Erfolgstext: nach dem Anlegen sollen die Felder wieder
        // leer sein — ein neuer key wirft das Formular samt defaultValues neu.
        <form
          key={state.success ?? "new"}
          action={formAction}
          className="flex flex-col gap-[8px]"
        >
          <FocusFields idPrefix="new-focus" />
          <button
            type="submit"
            disabled={pending}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
      )}

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </div>
  );
}

function FocusRow({ focus }: { focus: Focus }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateFocusAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteFocusAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-[var(--lcars-ink-dim)]/30 pb-[8px]">
      <button
        type="button"
        className="flex flex-wrap items-baseline gap-[8px] text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex-1 min-w-[180px]">{focus.name}</span>
        <span className="lcars-eyebrow">
          {focusDisciplineLabel(focus.discipline)}
        </span>
        {focus.isCustom && <span className="lcars-eyebrow">eigen</span>}
      </button>

      {!open && focus.descriptionHtml && (
        <div
          className="text-lcars-ink mission-body line-clamp-2 text-[13px]"
          dangerouslySetInnerHTML={{ __html: focus.descriptionHtml }}
        />
      )}

      {open && (
        <>
          <form action={formAction} className="flex flex-col gap-[8px]">
            <input type="hidden" name="id" value={focus.id} />
            <FocusFields idPrefix={`focus-${focus.id}`} focus={focus} />
            <div className="flex flex-wrap gap-[8px]">
              <button
                type="submit"
                disabled={pending}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>

          {/* Löschen nur bei selbst ergänzten Schwerpunkten — importierte
              stehen möglicherweise schon auf Charakterbögen (siehe
              actions.ts). */}
          {focus.isCustom && (
            <form action={deleteAction}>
              <input type="hidden" name="id" value={focus.id} />
              <button
                type="submit"
                disabled={deletePending}
                onClick={confirmSubmit(
                  `„${focus.name}“ wirklich löschen? Auf Charakterbögen bleibt der Eintrag dann als reiner Text stehen.`,
                )}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Löschen
              </button>
            </form>
          )}
        </>
      )}

      <FormError message={state.error ?? deleteState.error} />
      {(state.success ?? deleteState.success) && (
        <FormSuccess>{state.success ?? deleteState.success}</FormSuccess>
      )}
    </div>
  );
}

// Schwerpunkt-Verwaltung der Spielleitung: Katalog filtern, bestehende
// Einträge aufklappen und bearbeiten, neue ergänzen. Die Filterung läuft rein
// im Client — der Katalog ist mit gut 170 Einträgen klein genug, um ihn
// komplett auszuliefern (er landet ohnehin als Auswahlliste auf jedem
// Charakterbogen).
export default function FocusEditor({ focuses }: { focuses: Focus[] }) {
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState<string>("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return focuses.filter((focus) => {
      if (discipline && focus.discipline !== discipline) return false;
      if (!needle) return true;
      return (
        focus.name.toLowerCase().includes(needle) ||
        (focus.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [focuses, query, discipline]);

  return (
    <div className="flex flex-col gap-[16px]">
      <NewFocusForm />

      <div className="flex flex-wrap items-end gap-[8px]">
        <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
          <span className="lcars-eyebrow">Suche</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder Text"
            className="lcars-input rounded-full w-full"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Disziplin</span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="lcars-input rounded-full"
          >
            <option value="">Alle</option>
            {FOCUS_DISCIPLINES.map((key) => (
              <option key={key} value={key}>
                {FOCUS_DISCIPLINE_LABELS[key].label}
              </option>
            ))}
          </select>
        </label>
        <span className="lcars-eyebrow">
          {visible.length} von {focuses.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="lcars-empty-state">Keine Schwerpunkte gefunden.</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {visible.map((focus) => (
            <FocusRow key={focus.id} focus={focus} />
          ))}
        </div>
      )}
    </div>
  );
}
